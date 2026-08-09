'use strict';

/**
 * Spesifikasi 35 v3 §12/§13/§31/§32 — koordinator tunggal Evidence-First
 * Recall + Document Intelligence + Autofill. Dua entry point dipanggil
 * controller: `buildAutoFillPreview` (`/analisis`, stateless) dan
 * `applyAutofill` (`/autofill-apply`, STEP 1-10 §31, idempotent+concurrency-safe).
 */
const db = require('../../../models');
const { ProsnError } = require('../prosnpWorkflowService');
const textExtractor = require('./prosnpDocumentTextExtractor');
const classifier = require('./prosnpDocumentClassifier');
const suratExtractor = require('./extractors/suratPenugasanFieldExtractor');
const rapatExtractor = require('./extractors/rapatForkopimdaFieldExtractor');
const cadanganExtractor = require('./extractors/cadanganTargetFieldExtractor');
const inovasiExtractor = require('./extractors/inovasiFieldExtractor');
const nomenclatureResolverAdapter = require('./adapters/nomenclatureResolverAdapter');
const dpaRecallAdapter = require('./adapters/dpaRecallAdapter');
const penatausahaanRecallAdapter = require('./adapters/penatausahaanRecallAdapter');
const renstraIndicatorRecallAdapter = require('./adapters/renstraIndicatorRecallAdapter');
const narrativeDraftAdapter = require('./adapters/narrativeDraftAdapter');
const rebindService = require('../prosnpEvidenceRebindService');
const suratService = require('../prosnpSuratPenugasanService');
const rapatService = require('../prosnpRapatForkopimdaService');
const cadanganService = require('../prosnpCadanganPanganService');
const inovasiService = require('../prosnpInovasiService');

/**
 * §13 OPD Isolation Model (P0, NON-NEGOTIABLE). Setiap adapter yang menyentuh
 * Dpa/Penatausahaan/IndikatorRenstra WAJIB memanggil ini di awal dan
 * menyertakan hasilnya sbg filter WHERE — tidak ada fallback tanpa scope.
 */
async function resolveOpdScope(periode, tenantId, transaction) {
  const perangkatDaerahId = periode?.perangkat_daerah_id;
  if (!perangkatDaerahId) return { ok: false, code: 'OPD_MAPPING_NOT_FOUND' };
  const mapping = await db.PerangkatDaerahOpdMapping.findOne({ where: { perangkat_daerah_id: perangkatDaerahId }, transaction });
  if (!mapping) return { ok: false, code: 'OPD_MAPPING_NOT_FOUND' };
  return { ok: true, opd_penanggung_jawab_id: mapping.opd_penanggung_jawab_id, perangkat_daerah_id: perangkatDaerahId };
}

async function loadPengisianContext(pengisianId, tenantId, transaction) {
  const pengisian = await db.ProsnPengisian.findOne({
    where: { id: pengisianId, tenant_id: tenantId },
    include: [{ model: db.ProsnIndikator, as: 'indikator', include: [{ model: db.ProsnPeriode, as: 'periode' }] }],
    transaction,
  });
  if (!pengisian || !pengisian.indikator || !pengisian.indikator.periode) {
    throw new ProsnError('Pengisian ProSN tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
  }
  return pengisian;
}

function notFoundField(fieldKey, code, reason) {
  return { field_key: fieldKey, value: null, source_type: 'NOT_FOUND', source_reference: {}, confidence: 'NONE', reason: reason || code, extraction_method: null, requires_review: true, code };
}

const TIPE_FORM_EXTRACTOR = {
  penugasan_kdh: (text) => suratExtractor.extractSuratPenugasanFields(text),
  koordinasi_forkopimda: (text) => rapatExtractor.extractRapatForkopimdaFields(text),
  cadangan_pangan_beras: (text, jenisDokumen) => cadanganExtractor.extractCadanganTargetFields(text, jenisDokumen),
  inovasi_dan_perkada: (text, jenisDokumen) => inovasiExtractor.extractInovasiFields(text, jenisDokumen),
};

const TIPE_FORM_ENTITY_TYPE = {
  penugasan_kdh: 'SURAT_PENUGASAN',
  koordinasi_forkopimda: 'RAPAT_FORKOPIMDA',
  cadangan_pangan_beras: 'CADANGAN_TARGET',
  inovasi_dan_perkada: 'INOVASI',
};

/**
 * Corrective Pass "B.1.1 Required ringkasan_isi + Validation-Aware Autofill"
 * — TERBATAS pada `penugasan_kdh` sesuai mandat (TIDAK digeneralisasi ke
 * B.1.2/B.1.3/B.1.4 tanpa otorisasi terpisah). Metadata required-fields
 * ditarik dari SATU sumber kebenaran (`suratService.getRequiredFieldsMeta`,
 * sama persis dgn yang dipakai `validatePayload` saat apply) — supaya UI
 * tahu field mana yang wajib SEBELUM mengirim request yang pasti ditolak
 * backend, tanpa menduplikasi aturan validasi di tempat terpisah.
 */
const REQUIRED_FIELDS_PROVIDER_BY_TIPE_FORM = {
  penugasan_kdh: () => suratService.getRequiredFieldsMeta(),
};

function computeValidationState(tipeForm, fields) {
  const provider = REQUIRED_FIELDS_PROVIDER_BY_TIPE_FORM[tipeForm];
  if (!provider) return null; // tipe_form lain belum diotorisasi utk validation-aware metadata pass ini
  const meta = provider();
  const byKey = Object.fromEntries(fields.map((f) => [f.field_key, f]));
  const hasValue = (key) => {
    const f = byKey[key];
    return !!f && f.value !== null && f.value !== undefined && f.value !== '';
  };
  const missingRequiredFields = meta.requiredFields.filter((key) => !hasValue(key));
  const anyOfSatisfied = meta.cakupanGroup.anyOf.some((key) => byKey[key] && byKey[key].value === true);
  const anyOfGroup = { fields: [...meta.cakupanGroup.anyOf], message: meta.cakupanGroup.message };
  return {
    required_fields: meta.requiredFields,
    required_any_of_groups: [anyOfGroup],
    missing_required_fields: missingRequiredFields,
    missing_any_of_groups: anyOfSatisfied ? [] : [anyOfGroup],
    apply_ready: missingRequiredFields.length === 0 && anyOfSatisfied,
  };
}

/** §14 — Pagu/Realisasi Anggaran, opsional utk B.1.1/B.1.2/B.1.4 (B.1.3 punya jalur DPA cascading sendiri, TIDAK disentuh). */
async function recallPaguRealisasi(masterIndikatorId, tahun, opdPenanggungJawabId) {
  const nomen = await nomenclatureResolverAdapter.resolveNomenclature(masterIndikatorId, tahun, opdPenanggungJawabId);
  if (nomen.confidence !== 'HIGH') {
    const reason = nomen.candidates.length > 1
      ? 'Lebih dari satu kandidat sub kegiatan whitelist ditemukan — pilih manual (ambigu).'
      : 'Tidak ada data DPA yang cocok pada whitelist nomenklatur indikator ini.';
    return [notFoundField('pagu_anggaran', 'NOMENCLATURE_NOT_FOUND', reason), notFoundField('realisasi_anggaran', 'NOMENCLATURE_NOT_FOUND', reason)];
  }
  const kandidat = nomen.candidates[0];
  const dpaHasil = await dpaRecallAdapter.recall({ masterIndikatorId, tahun, opdPenanggungJawabId, kodeSubKegiatan: kandidat.kode_sub_kegiatan });
  const paguField = dpaHasil.value === null
    ? notFoundField('pagu_anggaran', dpaHasil.code)
    : { field_key: 'pagu_anggaran', value: dpaHasil.value, source_type: dpaHasil.source_type, source_reference: dpaHasil.source_reference, confidence: dpaHasil.confidence, reason: 'Ditemukan via DPA whitelist tunggal.', extraction_method: null, requires_review: false };

  let realisasiField;
  if (dpaHasil.value === null) {
    realisasiField = notFoundField('realisasi_anggaran', 'PENATAUSAHAAN_NOT_FOUND');
  } else {
    const penatHasil = await penatausahaanRecallAdapter.recall({ dpaId: dpaHasil.source_reference.dpa_id, opdPenanggungJawabId });
    realisasiField = penatHasil.value === null
      ? notFoundField('realisasi_anggaran', penatHasil.code)
      : { field_key: 'realisasi_anggaran', value: penatHasil.value, source_type: penatHasil.source_type, source_reference: penatHasil.source_reference, confidence: penatHasil.confidence, reason: null, extraction_method: null, requires_review: false };
  }
  return [paguField, realisasiField];
}

/**
 * §12 Contract orchestrator — entry point tunggal `/prosnp/bukti/:buktiId/analisis`.
 * Stateless kecuali caching `extracted_text_cache`/`extraction_method`/`extracted_at`/
 * `klasifikasi_meta` (idempotent, analisis ulang menimpa cache).
 */
async function buildAutoFillPreview({ buktiId, tenantId }) {
  const bukti = await db.ProsnBuktiDukung.findOne({ where: { id: buktiId, tenant_id: tenantId } });
  if (!bukti) throw new ProsnError('Bukti tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
  // pengisian_id DITURUNKAN dari staging binding bukti itu sendiri (§7 Phase A) — TIDAK
  // pernah diterima dari client, mencegah manipulasi scope (§19 authorization derivation).
  const stagingLink = await db.ProsnBuktiIndikator.findOne({ where: { bukti_dukung_id: buktiId, entity_type: 'PENGISIAN', tenant_id: tenantId } });
  if (!stagingLink) throw new ProsnError('Bukti belum melalui tahap staging (unggah awal) sebelum dapat dianalisis.', 404, 'PROSNP_EVIDENCE_NOT_STAGED');
  const pengisian = await loadPengisianContext(stagingLink.pengisian_id, tenantId, null);

  const warnings = [];
  const extraction = await textExtractor.extractTextFromBukti(bukti, null);
  warnings.push(...extraction.warnings);

  let klasifikasi;
  if (extraction.extractFailed) {
    klasifikasi = { jenis_dokumen: null, confidence: 'NONE', reason: extraction.warnings[0] || 'Ekstraksi gagal — teks tidak terbaca.', method: 'rule_based', requires_review: true };
  } else {
    klasifikasi = classifier.classifyDocument(extraction.text);
    await db.ProsnBuktiDukung.update({ klasifikasi_meta: klasifikasi }, { where: { id: bukti.id } });
  }

  const tipeForm = pengisian.indikator.tipe_form;
  const text = extraction.text || '';
  const docFields = TIPE_FORM_EXTRACTOR[tipeForm] ? TIPE_FORM_EXTRACTOR[tipeForm](text, klasifikasi.jenis_dokumen) : [];

  const scope = await resolveOpdScope(pengisian.indikator.periode, tenantId, null);
  const tahun = pengisian.indikator.periode.tahun;
  const masterIndikatorId = pengisian.indikator.master_indikator_id;
  let recallFields = [];
  if (!scope.ok) {
    warnings.push('OPD_MAPPING_NOT_FOUND — periode ini belum terhubung ke ruang ID OPD lama, hubungi Administrator.');
    recallFields = [
      notFoundField('pagu_anggaran', 'OPD_MAPPING_NOT_FOUND'),
      notFoundField('realisasi_anggaran', 'OPD_MAPPING_NOT_FOUND'),
      notFoundField('target_indikator', 'OPD_MAPPING_NOT_FOUND'),
      notFoundField('realisasi_indikator', 'OPD_MAPPING_NOT_FOUND'),
    ];
  } else {
    // B.1.3 punya jalur DPA cascading existing sendiri — TIDAK ditambah pagu/realisasi generik di sini.
    const paguRealisasi = tipeForm === 'cadangan_pangan_beras' || !masterIndikatorId
      ? []
      : await recallPaguRealisasi(masterIndikatorId, tahun, scope.opd_penanggung_jawab_id);
    let indikatorFields = [];
    if (masterIndikatorId) {
      const renstraHasil = await renstraIndicatorRecallAdapter.recall({ masterIndikatorId, tahun, opdPenanggungJawabId: scope.opd_penanggung_jawab_id, transaction: null });
      indikatorFields = [
        { field_key: 'target_indikator', ...renstraHasil.target },
        { field_key: 'realisasi_indikator', ...renstraHasil.realisasi },
      ];
    }
    recallFields = [...paguRealisasi, ...indikatorFields];
  }

  const narrativeDraft = await narrativeDraftAdapter.buildNarrativeDraft({ tipeForm, confirmedFields: docFields });

  const allFields = [...docFields, ...recallFields];
  const validation = computeValidationState(tipeForm, allFields);

  return {
    bukti_id: Number(buktiId),
    klasifikasi,
    fields: allFields,
    ...(validation ? { validation } : {}),
    narrative_draft: narrativeDraft,
    warnings,
  };
}

/** Provenance minimal per §3 D3 — 1 kolom JSON, bukan kolom per-field. */
function buildProvenance(fields, actor) {
  const perField = {};
  fields.forEach((f) => {
    perField[f.field_key] = { source_type: f.source_type, confidence: f.confidence, extraction_method: f.extraction_method || null, source_reference: f.source_reference || {} };
  });
  return { fields: perField, confirmed_by: actor.id, confirmed_at: new Date().toISOString() };
}

const RECALL_SOURCE_TYPES = new Set(['DPA_RECALL', 'PENATAUSAHAAN_RECALL', 'INDIKATOR_RENSTRA_RECALL', 'RENSTRA_RECALL']);

/** §32 Stale Recall Handling — re-jalankan resolver yg sama, bandingkan exact. */
async function assertNotStale(fields, context) {
  const stale = [];
  for (const f of fields) {
    if (!RECALL_SOURCE_TYPES.has(f.source_type)) continue; // eslint-disable-line no-continue
    let freshValue;
    if (f.source_type === 'DPA_RECALL') {
      // eslint-disable-next-line no-await-in-loop
      const fresh = await dpaRecallAdapter.recall({ masterIndikatorId: context.masterIndikatorId, tahun: context.tahun, opdPenanggungJawabId: context.opdPenanggungJawabId, kodeSubKegiatan: f.source_reference?.kode_sub_kegiatan });
      freshValue = fresh.value;
    } else if (f.source_type === 'PENATAUSAHAAN_RECALL') {
      // eslint-disable-next-line no-await-in-loop
      const fresh = await penatausahaanRecallAdapter.recall({ dpaId: f.source_reference?.dpa_id, opdPenanggungJawabId: context.opdPenanggungJawabId });
      freshValue = fresh.value;
    } else {
      // eslint-disable-next-line no-await-in-loop
      const fresh = await renstraIndicatorRecallAdapter.recall({ masterIndikatorId: context.masterIndikatorId, tahun: context.tahun, opdPenanggungJawabId: context.opdPenanggungJawabId, transaction: null });
      freshValue = f.field_key === 'target_indikator' ? fresh.target.value : fresh.realisasi.value;
    }
    if (String(freshValue) !== String(f.value)) stale.push({ field_key: f.field_key, old_value: f.value, new_value: freshValue });
  }
  if (stale.length) {
    const error = new ProsnError('Data sumber berubah sejak preview terakhir — muat ulang analisis sebelum menerapkan.', 409, 'AUTOFILL_STALE');
    error.staleFields = stale;
    throw error;
  }
}

async function loadEntity(entityType, entityId, transaction) {
  const modelName = rebindService.ENTITY_MODEL_BY_TYPE[entityType];
  if (entityType === 'CADANGAN_TARGET') return db.ProsnCadanganTarget.findByPk(entityId, { transaction });
  return db[modelName].findByPk(entityId, { transaction });
}

/** §12/§14 — kategori binding default per entityType, diturunkan dari klasifikasi dokumen (bukan ditebak bebas). */
function kategoriDariKlasifikasi(entityType, jenisDokumen) {
  const MAP = {
    SURAT_PENUGASAN: { surat_penugasan: 'surat_penugasan', sk_penugasan: 'surat_penugasan', default: 'surat_penugasan' },
    RAPAT_FORKOPIMDA: { notulen_rapat_koordinasi: 'notulen', default: 'undangan' },
    CADANGAN_TARGET: { keputusan_gubernur: 'keputusan_kdh', default: 'keputusan_kdh' },
    INOVASI: { peraturan_gubernur: 'perkada', laporan_pelaksanaan: 'bukti_implementasi', default: 'bukti_implementasi' },
  };
  const table = MAP[entityType] || {};
  return table[jenisDokumen] || table.default;
}

function fieldsToPayload(fields) {
  const values = {};
  fields.forEach((f) => { if (f.value !== null && f.value !== undefined) values[f.field_key] = f.value; });
  return values;
}

/**
 * STEP 6 — create entity via service register existing sesuai tipe_form
 * (REUSE, business logic TIDAK DIUBAH). P1 Atomic Transaction Boundary:
 * `transaction` yang SAMA dgn STEP 2 (staging lock) WAJIB diteruskan via
 * `options.transaction` — keempat service register kini mendukung ini
 * (createCore/create dispatcher, lihat masing2 file) tanpa membuka
 * `db.sequelize.transaction()` baru saat opsi ini diberikan.
 */
async function createEntityViaRegisterService(entityType, pengisian, fields, actor, tenantId, transaction) {
  const payload = fieldsToPayload(fields);
  switch (entityType) {
    case 'SURAT_PENUGASAN':
      return suratService.create(pengisian.id, payload, actor, tenantId, { transaction });
    case 'RAPAT_FORKOPIMDA':
      return rapatService.create(pengisian.id, payload, actor, tenantId, { transaction });
    case 'CADANGAN_TARGET':
      return cadanganService.createTarget({ ...payload, tahun_target: pengisian.indikator.periode.tahun }, actor, tenantId, { transaction });
    case 'INOVASI':
      return inovasiService.create(pengisian.id, payload, actor, tenantId, { transaction });
    default:
      throw new ProsnError(`entity_type ${entityType} tidak dikenali.`, 400, 'PROSNP_EVIDENCE_ENTITY_TYPE_INVALID');
  }
}

const PROVENANCE_MODEL_BY_TYPE = {
  SURAT_PENUGASAN: 'ProsnSuratPenugasan',
  RAPAT_FORKOPIMDA: 'ProsnRapatForkopimda',
  CADANGAN_TARGET: 'ProsnCadanganTarget',
  INOVASI: 'ProsnInovasi',
};

/**
 * §31 STEP 1-10 — P0 idempotent + concurrency-safe apply. Serialization key
 * efektif = staging binding `bukti_id + pengisian_id + tenant_id` (§31 Lock
 * Scope) — DIKUNCI SEBELUM entity apa pun dibuat (root cause fix v3, lihat
 * `prosnpEvidenceRebindService.lockStagingPengisianBinding`).
 *
 * P1 Atomic Transaction Boundary (corrective pass): STEP 2 (lock staging),
 * STEP 4 (target lookup), STEP 5 (stale validation), STEP 6 (create entity),
 * STEP 7 (provenance), dan STEP 8 (evidence rebind) SEKARANG seluruhnya
 * berjalan di dalam SATU transaksi Sequelize yang sama (`transaction` di
 * bawah). Keempat service register (`prosnpSuratPenugasanService.js` dkk)
 * direfactor minimal untuk menerima `options.transaction` opsional — bila
 * diberikan, service REUSE transaksi tsb (tidak membuka transaksi baru);
 * caller manual existing yang tidak memberikan opsi ini TIDAK terpengaruh
 * sama sekali (backward compatible, lihat masing2 file). Kegagalan pada
 * STEP 7/8 SEKARANG otomatis me-rollback STEP 6 lewat mekanisme rollback DB
 * native — TIDAK LAGI memerlukan compensating delete.
 */
async function applyAutofill({ buktiId, pengisianId, entityType, fields, actor, tenantId }) {
  const validEntityTypes = new Set(Object.values(TIPE_FORM_ENTITY_TYPE));
  if (!validEntityTypes.has(entityType)) throw new ProsnError(`entity_type ${entityType} tidak dikenali untuk autofill-apply.`, 400, 'PROSNP_EVIDENCE_ENTITY_TYPE_INVALID');

  return runTransactionWithDeadlockRetry(() => applyAutofillTransaction({ buktiId, pengisianId, entityType, fields, actor, tenantId }));
}

/**
 * Temuan implementasi Fase 5 (Test R): query lock STEP 2 bisa dipilih optimizer
 * MySQL melalui index composite lain (mis. `uq_prosnp_bukti_indikator_binding`)
 * yang cakupannya lebih luas dari 1 baris presisi saat digabung dgn INSERT
 * baris target pada STEP 8 — menghasilkan GENUINE InnoDB deadlock (bukan
 * WAIT bersih) pada sebagian kecil percobaan concurrent identity sama persis.
 * Ini adalah perilaku standar InnoDB utk pola SELECT...FOR UPDATE + INSERT
 * pada index overlap — resolusi baku industri: retry OTOMATIS transaksi yang
 * di-abort InnoDB (bukan melemahkan guard STEP 2, EXACTLY ONE tetap terjaga
 * krn deadlock hanya me-rollback SATU sisi, sisi lain tetap commit sah; retry
 * akan menemukan hasil commit tsb di STEP 4 dan kembali sbg idempotent replay).
 */
async function runTransactionWithDeadlockRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn();
    } catch (error) {
      const isDeadlock = error?.original?.code === 'ER_LOCK_DEADLOCK' || error?.parent?.code === 'ER_LOCK_DEADLOCK';
      if (!isDeadlock || attempt === maxAttempts) throw error;
    }
  }
  return undefined;
}

async function applyAutofillTransaction({ buktiId, pengisianId, entityType, fields, actor, tenantId }) {
  return db.sequelize.transaction(async (transaction) => {
    // STEP 1 — validasi dasar sudah di atas; authorization (allowRoles) sudah terjadi di route.
    const pengisian = await loadPengisianContext(pengisianId, tenantId, transaction);
    if (TIPE_FORM_ENTITY_TYPE[pengisian.indikator.tipe_form] !== entityType) {
      throw new ProsnError('entity_type tidak sesuai dengan tipe_form indikator pengisian ini.', 409, 'PROSNP_TIPE_MISMATCH');
    }

    // STEP 2 — LOCK STAGING BINDING (SERIALIZATION POINT)
    await rebindService.lockStagingPengisianBinding(buktiId, pengisianId, tenantId, transaction);

    // STEP 4 — CEK TARGET BINDING SUDAH ADA (setelah lock diperoleh, sebelum create apa pun)
    const entityAssociation = { SURAT_PENUGASAN: db.ProsnSuratPenugasan, RAPAT_FORKOPIMDA: db.ProsnRapatForkopimda, CADANGAN_TARGET: db.ProsnCadanganTarget, INOVASI: db.ProsnInovasi }[entityType];
    const existingLinks = await db.ProsnBuktiIndikator.findAll({ where: { bukti_dukung_id: buktiId, entity_type: entityType, tenant_id: tenantId }, transaction });
    let existingLink = null;
    for (const link of existingLinks) {
      if (entityType === 'CADANGAN_TARGET') {
        // CADANGAN_TARGET bersifat tenant+tahun-scoped (bukan per-pengisian, lihat catatan
        // yang sama di prosnpEvidenceRebindService.js) — binding yg ditemukan di sini SUDAH
        // pasti sah krn hanya bisa tercipta lewat apply/rebind identity bukti ini sendiri.
        existingLink = link; break; // eslint-disable-line no-await-in-loop
      }
      // eslint-disable-next-line no-await-in-loop
      const entity = await entityAssociation.findOne({ where: { id: link.entity_id, tenant_id: tenantId }, transaction });
      if (entity && Number(entity.pengisian_id) === Number(pengisianId)) { existingLink = link; break; }
    }
    if (existingLink) {
      return {
        entity: await loadEntity(entityType, existingLink.entity_id, transaction),
        evidence_link: existingLink,
        created: false,
        idempotent_replay: true,
        warnings: [],
      };
    }

    // STEP 5 — REVALIDATE STALENESS (§32)
    const scope = await resolveOpdScope(pengisian.indikator.periode, tenantId, transaction);
    if (scope.ok) {
      await assertNotStale(fields, { masterIndikatorId: pengisian.indikator.master_indikator_id, tahun: pengisian.indikator.periode.tahun, opdPenanggungJawabId: scope.opd_penanggung_jawab_id });
    }

    // STEP 6 — CREATE ENTITY, transaction YANG SAMA dgn STEP 2 (P1 Atomic Transaction Boundary)
    const entity = await createEntityViaRegisterService(entityType, pengisian, fields, actor, tenantId, transaction);

    // STEP 7 — WRITE PROVENANCE (transaction YANG SAMA)
    const provenanceModel = PROVENANCE_MODEL_BY_TYPE[entityType];
    await db[provenanceModel].update({ provenance: buildProvenance(fields, actor) }, { where: { id: entity.id, tenant_id: tenantId }, transaction });

    // STEP 8 — REBIND EVIDENCE (transaction YANG SAMA)
    const bukti = await db.ProsnBuktiDukung.findOne({ where: { id: buktiId, tenant_id: tenantId }, transaction });
    const jenisDokumen = bukti?.klasifikasi_meta?.jenis_dokumen || null;
    const kategori = kategoriDariKlasifikasi(entityType, jenisDokumen);
    const { link } = await rebindService.rebindBuktiKeEntity(buktiId, entityType, entity.id, kategori, actor, tenantId, transaction);

    // STEP 9 — RETURN FIRST SUCCESS. Bila STEP 7/8 melempar error, exception
    // menjalar keluar dari callback db.sequelize.transaction(...) di bawah,
    // yang secara otomatis melakukan ROLLBACK atas SELURUH transaksi
    // (termasuk STEP 6 create entity) — tidak perlu compensating delete.
    return { entity, evidence_link: link, created: true, idempotent_replay: false, warnings: [] };
    // STEP 10 — COMMIT (implisit)
  });
}

module.exports = { resolveOpdScope, buildAutoFillPreview, applyAutofill, loadPengisianContext, computeValidationState };
