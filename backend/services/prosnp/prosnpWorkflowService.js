'use strict';

const db = require('../../models');
const crypto = require('crypto');
const { initializeInitialIndicators } = require('./prosnpInitialIndicators');
const evidenceGate = require('./prosnpEvidenceGateService');
const { resolveDefaultCutoff } = require('./ruleEngine/prosnpB13RuleEngine');

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMINISTRATOR']);
const OPERATOR_ROLES = new Set(['PELAKSANA']);
const REVIEWER_ROLES = new Set(['PENGAWAS']);
const INPUT_ROLES = new Set(['PROSN_INPUT']);
const PHASE_1_TRANSITIONS = {
  belum_diisi: new Set(['dalam_pengisian']),
  dalam_pengisian: new Set(['lengkap']),
  lengkap: new Set(['perlu_perbaikan', 'siap_diinput_prosn']),
  perlu_perbaikan: new Set(['dalam_pengisian']),
  siap_diinput_prosn: new Set(['diinput_manual']),
};

class ProsnError extends Error {
  constructor(message, status = 400, code = 'PROSNP_VALIDATION_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function roleOf(actor) {
  return String(actor?.role || '').trim().toUpperCase().replace(/\s+/g, '_');
}
function isAdmin(actor) { return ADMIN_ROLES.has(roleOf(actor)); }
function isInputOfficer(actor) { return INPUT_ROLES.has(roleOf(actor)) || isAdmin(actor); }
function assertRole(actor, allowed, message = 'Akses ProSN ditolak.') {
  if (!allowed.has(roleOf(actor)) && !isAdmin(actor)) throw new ProsnError(message, 403, 'PROSNP_FORBIDDEN');
}
function assertPositiveInteger(value, field) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1) throw new ProsnError(`${field} wajib berupa bilangan bulat positif.`);
  return result;
}
function assertLockVersion(value) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new ProsnError('lock_version wajib dikirim dari data terakhir.');
  return result;
}
function assertSameTenant(row, tenantId) {
  if (!row || Number(row.tenant_id) !== Number(tenantId)) throw new ProsnError('Data ProSN tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
}
function validateForm(indikator, dataForm) {
  if (!dataForm || typeof dataForm !== 'object' || Array.isArray(dataForm)) throw new ProsnError('data_form wajib berupa objek JSON.');
  const required = indikator.konfigurasi_form?.required || [];
  for (const key of required) {
    const value = dataForm[key];
    if (value === null || value === undefined || value === '') throw new ProsnError(`data_form.${key} wajib diisi sebelum status Lengkap.`);
  }
}

async function getPengisianScoped(id, tenantId, transaction) {
  const row = await db.ProsnPengisian.findByPk(id, {
    include: [
      { model: db.ProsnKategoriReferensi, as: 'hambatanKategori' },
      { model: db.ProsnKategoriReferensi, as: 'tindakLanjutKategori' },
      {
        model: db.ProsnIndikator,
        as: 'indikator',
        include: [
          { model: db.ProsnPeriode, as: 'periode' },
          { model: db.ProsnBuktiDukung, as: 'buktiDukung', through: { attributes: ['id', 'checklist_status', 'catatan_kekurangan', 'relevansi', 'lock_version'] } },
        ],
      },
    ],
    transaction,
  });
  assertSameTenant(row, tenantId);
  if (!row.indikator || Number(row.indikator.tenant_id) !== Number(tenantId) || !row.indikator.periode) {
    throw new ProsnError('Relasi pengisian ProSN tidak valid.', 409, 'PROSNP_SCOPE_INVALID');
  }
  return row;
}

async function createPeriod(payload, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat membuat periode.', 403, 'PROSNP_FORBIDDEN');
  const { tahun, semester = 'tahunan', nama, tanggal_mulai, tanggal_tenggat, tanggal_cutoff = null, perangkat_daerah_id, catatan = null } = payload;
  if (!/^\d{4}$/.test(String(tahun || ''))) throw new ProsnError('tahun harus empat digit.');
  if (!['1', '2', 'tahunan'].includes(String(semester))) throw new ProsnError('semester tidak valid.');
  if (!nama || !tanggal_mulai || !tanggal_tenggat) throw new ProsnError('nama, tanggal_mulai, dan tanggal_tenggat wajib diisi.');
  if (new Date(tanggal_mulai) > new Date(tanggal_tenggat)) throw new ProsnError('tanggal_tenggat harus sesudah tanggal_mulai.');
  // Corrective "B.1.3 Period Cutoff Wiring" (mandat §3): bila tanggal_cutoff tidak
  // dikirim eksplisit, default-isi dari turunan substantif tahun+semester (30 Juni/31
  // Desember) — TIDAK menimpa tanggal_tenggat (tetap tenggat administratif independen).
  const tanggalCutoffEfektif = tanggal_cutoff || resolveDefaultCutoff(tahun, semester);

  try {
    return await db.sequelize.transaction(async (transaction) => {
      const periode = await db.ProsnPeriode.create({ tenant_id: tenantId, perangkat_daerah_id: assertPositiveInteger(perangkat_daerah_id, 'perangkat_daerah_id'), tahun: String(tahun), semester, nama, tanggal_mulai, tanggal_tenggat, tanggal_cutoff: tanggalCutoffEfektif, catatan, created_by: actor.id, updated_by: actor.id }, { transaction });
      await initializeInitialIndicators({ periode, actorId: actor.id, transaction });
      return periode;
    });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') throw new ProsnError('Periode ProSN untuk OPD, tahun, dan semester tersebut sudah ada.', 409, 'PROSNP_PERIOD_DUPLICATE');
    throw error;
  }
}

/**
 * Corrective "B.1.3 Period Cutoff Wiring" (mandat §3): update TERBATAS —
 * hanya field metadata non-struktural (tanggal_cutoff/tanggal_tenggat/catatan).
 * TIDAK mengizinkan ubah tahun/semester/perangkat_daerah_id (implikasi unique
 * constraint & inisialisasi indikator, di luar scope corrective ini).
 * `ProsnPeriode` tidak punya kolom lock_version (berbeda dari ProsnPengisian/
 * ProsnBuktiDukung dll.) — konsisten dgn fungsi transisi periode lain di file
 * ini (activatePeriod/archivePeriode/dst.) yang juga tidak memakainya.
 */
async function updatePeriode(id, payload, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat mengubah periode.', 403, 'PROSNP_FORBIDDEN');
  return db.sequelize.transaction(async (transaction) => {
    const periode = await db.ProsnPeriode.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!periode) throw new ProsnError('Periode tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    const tanggalTenggatBaru = payload.tanggal_tenggat || periode.tanggal_tenggat;
    const tanggalCutoffBaru = Object.prototype.hasOwnProperty.call(payload, 'tanggal_cutoff') ? (payload.tanggal_cutoff || null) : periode.tanggal_cutoff;
    if (new Date(periode.tanggal_mulai) > new Date(tanggalTenggatBaru)) throw new ProsnError('tanggal_tenggat harus sesudah tanggal_mulai.');
    await periode.update({
      tanggal_tenggat: tanggalTenggatBaru, tanggal_cutoff: tanggalCutoffBaru,
      catatan: Object.prototype.hasOwnProperty.call(payload, 'catatan') ? payload.catatan : periode.catatan,
      updated_by: actor.id,
    }, { transaction });
    return periode;
  });
}

async function initializePeriodIndicators(id, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat menginisialisasi indikator.', 403, 'PROSNP_FORBIDDEN');
  return db.sequelize.transaction(async (transaction) => {
    const periode = await db.ProsnPeriode.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!periode) throw new ProsnError('Periode tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (periode.status !== 'draft') throw new ProsnError('Indikator awal hanya dapat diinisialisasi pada periode draft.', 409, 'PROSNP_PERIOD_NOT_DRAFT');
    await initializeInitialIndicators({ periode, actorId: actor.id, transaction });
    return db.ProsnIndikator.findAll({ where: { tenant_id: tenantId, periode_id: periode.id }, order: [['urutan', 'ASC']], transaction });
  });
}

async function activatePeriod(id, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat mengaktifkan periode.', 403, 'PROSNP_FORBIDDEN');
  return db.sequelize.transaction(async (transaction) => {
    const periode = await db.ProsnPeriode.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    assertSameTenant(periode, tenantId);
    if (periode.status !== 'draft') throw new ProsnError('Hanya periode draft yang dapat diaktifkan.', 409, 'PROSNP_PERIOD_NOT_DRAFT');
    const indikator = await db.ProsnIndikator.findAll({ where: { tenant_id: tenantId, periode_id: periode.id, aktif: true }, transaction, lock: transaction.LOCK.UPDATE });
    if (!indikator.length) throw new ProsnError('Periode belum memiliki indikator aktif.', 409, 'PROSNP_INDICATOR_REQUIRED');
    await db.ProsnPengisian.bulkCreate(indikator.map((item) => ({ tenant_id: tenantId, indikator_id: item.id, data_form: {}, created_by: actor.id, updated_by: actor.id })), { ignoreDuplicates: true, transaction });
    await periode.update({ status: 'aktif', updated_by: actor.id }, { transaction });
    return periode;
  });
}

async function createIndikator(periodeId, payload, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat menambah indikator.', 403, 'PROSNP_FORBIDDEN');
  const periode = await db.ProsnPeriode.findByPk(periodeId);
  assertSameTenant(periode, tenantId);
  if (periode.status !== 'draft') throw new ProsnError('Indikator hanya dapat ditambahkan pada periode draft.', 409, 'PROSNP_PERIOD_NOT_DRAFT');
  const { kode, nama, tipe_form, konfigurasi_form, satuan_default = null, rumus = null, wajib_bukti = true, minimum_bukti = 1, urutan = 0, renja_pro_sn_master_id = null, renja_dukungan_prosn_tematik_id = null } = payload;
  if (!kode || !nama || !['dukungan_program', 'target_capaian_rasio', 'distribusi_status'].includes(tipe_form)) throw new ProsnError('kode, nama, dan tipe_form valid wajib diisi.');
  if (!konfigurasi_form || typeof konfigurasi_form !== 'object' || Array.isArray(konfigurasi_form)) throw new ProsnError('konfigurasi_form wajib berupa objek JSON.');
  try {
    return await db.ProsnIndikator.create({ tenant_id: tenantId, periode_id: periode.id, kode, nama, tipe_form, konfigurasi_form, satuan_default, rumus, wajib_bukti: Boolean(wajib_bukti), minimum_bukti: Number(minimum_bukti) || 0, urutan: Number(urutan) || 0, renja_pro_sn_master_id, renja_dukungan_prosn_tematik_id, created_by: actor.id, updated_by: actor.id });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') throw new ProsnError('Kode indikator sudah digunakan pada periode ini.', 409, 'PROSNP_INDICATOR_DUPLICATE');
    throw error;
  }
}

async function updatePengisian(id, payload, actor, tenantId) {
  assertRole(actor, OPERATOR_ROLES, 'Hanya Operator atau Administrator yang dapat mengubah pengisian.');
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const row = await getPengisianScoped(id, tenantId, transaction);
    if (!['belum_diisi', 'dalam_pengisian'].includes(row.status)) throw new ProsnError('Pengisian hanya dapat diubah saat Belum Diisi atau Dalam Pengisian.', 409, 'PROSNP_EDIT_LOCKED');
    if (row.indikator.periode.status !== 'aktif') throw new ProsnError('Periode tidak aktif.', 409, 'PROSNP_PERIOD_LOCKED');
    if (row.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    if (!isAdmin(actor) && row.diisi_oleh && Number(row.diisi_oleh) !== Number(actor.id)) throw new ProsnError('Operator hanya dapat mengubah pengisian miliknya.', 403, 'PROSNP_NOT_OWNER');
    // sumber_data_is_auto TIDAK PERNAH dipercaya langsung dari client (anti-spoof)
    // — controller (prosnpController.updatePengisian) yg menghitung nilainya
    // server-side (bandingkan sumber_data submitted dgn saran sistem terkini)
    // SEBELUM memanggil fungsi ini; di sini hanya field yg SUDAH lulus
    // verifikasi server yg diizinkan tersimpan (mandat "ProSN Semester-II
    // Readiness — Sumber Data Authoritative Auto-Sync" §19).
    const editable = ['data_form', 'target_nilai', 'realisasi_nilai', 'satuan', 'sumber_data', 'sumber_data_is_auto', 'sumber_data_tanggal_posisi', 'sumber_data_referensi_dokumen', 'periode_data', 'hambatan', 'hambatan_kategori_id', 'tindak_lanjut', 'tindak_lanjut_kategori_id'];
    // rasio_nilai HANYA boleh diterima dari client utk tipe_form generik lama
    // (target_capaian_rasio, dihitung client-side sejak sebelum redesign). Utk
    // capaian_persentase_bertingkat (spek 34) rasio_nilai SELALU dihitung ulang
    // server-side oleh rule engine — tidak pernah diterima dari body request
    // (prinsip "tidak ada skor yang diketik manusia", koreksi wajib #5).
    if (row.indikator.tipe_form === 'target_capaian_rasio') editable.push('rasio_nilai');
    const values = Object.fromEntries(editable.filter((key) => Object.prototype.hasOwnProperty.call(payload, key)).map((key) => [key, payload[key]]));
    if (Object.prototype.hasOwnProperty.call(values, 'data_form')) validateForm(row.indikator, values.data_form);
    const [count] = await db.ProsnPengisian.update({ ...values, status: row.status === 'belum_diisi' ? 'dalam_pengisian' : row.status, diisi_oleh: row.diisi_oleh || actor.id, diisi_at: new Date(), updated_by: actor.id, lock_version: expectedVersion + 1 }, { where: { id: row.id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    return getPengisianScoped(id, tenantId, transaction);
  });
}

const TIPE_FORM_BARU = new Set([
  'penugasan_kdh', 'koordinasi_forkopimda', 'cadangan_pangan_beras', 'inovasi_dan_perkada',
  'status_bertingkat_evidence', 'checklist_proporsional_evidence', 'pelaporan_berkala_evidence', 'capaian_persentase_bertingkat',
]);
const CHILD_MODEL_BY_TIPE_FORM = {
  penugasan_kdh: 'ProsnSuratPenugasan',
  koordinasi_forkopimda: 'ProsnRapatForkopimda',
  cadangan_pangan_beras: 'ProsnStokTransaksi',
  inovasi_dan_perkada: 'ProsnInovasi',
  status_bertingkat_evidence: 'ProsnSatgasMbg',
  checklist_proporsional_evidence: 'ProsnSarprasKomponenMbg',
  pelaporan_berkala_evidence: 'ProsnLaporanSatgasMbg',
  // capaian_persentase_bertingkat SENGAJA tidak punya child model — datanya di kolom
  // generik prosnp_pengisian (target_nilai/realisasi_nilai), bukan tabel anak (spek 34 §3.5).
};

/**
 * Guard "Ke LENGKAP" khusus tipe_form baru B.1.1-B.1.4 (mandat §15/§16):
 * bukti wajib VALID (bukan cuma terunggah), rule engine sudah dijalankan
 * (skor_indikatif_internal tersimpan), dan minimal satu baris data register
 * sudah dicatat. Ini MENGGANTIKAN validateForm(data_form) generik untuk 4
 * tipe ini karena data sesungguhnya ada di tabel anak, bukan data_form JSON.
 */
async function adaKategoriValidPadaIndikator(indikatorId, kategoriList, tenantId, transaction) {
  const count = await db.ProsnBuktiIndikator.count({
    where: { indikator_id: indikatorId, tenant_id: tenantId },
    include: [{ model: db.ProsnBuktiDukung, as: 'buktiDukung', where: { status: ['aktif', 'perlu_perbaikan'], status_verifikasi: 'valid', kategori: kategoriList }, required: true }],
    transaction,
  });
  return count > 0;
}

/**
 * Evidence Category Gate per tipe_form (mandat §6) — menggantikan
 * `minimum_bukti >= N` generik yang sebelumnya satu-satunya penjaga.
 * Cek `minimum_bukti` TETAP dipertahankan sbg lantai keamanan tambahan
 * (bukan satu-satunya, sesuai instruksi "jangan lagi HANYA memakai itu").
 */
/**
 * Corrective "ProSN Semester-II Readiness — Completion Readiness Itemized
 * Blockers" (mandat §31/Req O) — SATU sumber kebenaran utk seluruh syarat
 * status Lengkap, dikumpulkan sbg ARRAY (bukan throw-on-first) agar bisa
 * dipakai DUA cara: (1) `assertKelengkapanTipeBaru` di bawah TETAP throw pada
 * blocker PERTAMA dgn message/code PERSIS SAMA seperti sebelumnya (urutan
 * pengecekan tidak berubah — perilaku transisi status Lengkap yang sudah ada
 * TIDAK diubah sama sekali, mandat "do not change substantive completion
 * requirements"); (2) endpoint pre-check baru (read-only) bisa menampilkan
 * SEMUA blocker sekaligus ke user sebelum mencoba transisi.
 */
async function collectKelengkapanBlockers(row, tenantId, transaction) {
  const blockers = [];
  const childModelName = CHILD_MODEL_BY_TIPE_FORM[row.indikator.tipe_form];
  if (childModelName) {
    const jumlahAnak = await db[childModelName].count({ where: { pengisian_id: row.id, tenant_id: tenantId }, transaction });
    if (jumlahAnak === 0) blockers.push({ code: 'PROSNP_REGISTER_EMPTY', message: 'Belum ada data register yang dicatat untuk indikator ini.' });
  }

  // Cadangan Pangan Beras dikecualikan dari lantai `minimum_bukti` generik ini:
  // bukti KEPUTUSAN_KDH/KARTU_STOK/REKONSILIASI-nya terikat ke ProsnCadanganTarget
  // (entity tenant+tahun, dipakai bersama semua periode tahun tsb — lihat
  // CadanganPanganBerasSection.jsx), BUKAN ke indikator_id periode ini, sehingga
  // hitungan per-indikator_id di sini akan selalu nol pada periode kedua dst.
  // Kelayakannya sudah dicek lebih presisi di blok cadangan_pangan_beras di bawah.
  if (row.indikator.wajib_bukti && row.indikator.tipe_form !== 'cadangan_pangan_beras') {
    const buktiValidCount = await db.ProsnBuktiIndikator.count({
      where: { indikator_id: row.indikator_id, tenant_id: tenantId },
      include: [{ model: db.ProsnBuktiDukung, as: 'buktiDukung', where: { status: ['aktif', 'perlu_perbaikan'], status_verifikasi: 'valid' }, required: true }],
      transaction,
    });
    if (buktiValidCount < (row.indikator.minimum_bukti || 1)) {
      blockers.push({ code: 'PROSNP_BUKTI_BELUM_VALID', message: `Bukti wajib berstatus Valid minimal ${row.indikator.minimum_bukti || 1} berkas (saat ini ${buktiValidCount}) — minta Pemeriksa memvalidasi bukti terlebih dahulu.` });
    }
  }

  if (row.indikator.tipe_form === 'penugasan_kdh') {
    // §6.1: status Lengkap wajib ADA BUKTI_TINDAK_LANJUT valid, terlepas dari surat mana pun.
    const ada = await adaKategoriValidPadaIndikator(row.indikator_id, ['bukti_tindak_lanjut'], tenantId, transaction);
    if (!ada) blockers.push({ code: 'PROSNP_EVIDENCE_GATE_BUKTI_TINDAK_LANJUT', message: 'Status Lengkap mensyaratkan minimal satu dokumen BUKTI_TINDAK_LANJUT berstatus Valid (mandat §6.1).' });
  }
  if (row.indikator.tipe_form === 'cadangan_pangan_beras') {
    // §6.3: KEPUTUSAN_KDH AND (KARTU_STOK OR REKONSILIASI_STOK) — dicek entity-scoped
    // ke ProsnCadanganTarget aktif tahun ini (sama seperti rule engine), bukan
    // per-indikator_id, karena target bersifat tenant+tahun (dipakai lintas periode).
    const target = await db.ProsnCadanganTarget.findOne({ where: { tenant_id: tenantId, tahun_target: row.indikator.periode.tahun, status_aktif: true }, transaction });
    if (!target) {
      blockers.push({ code: 'PROSNP_EVIDENCE_GATE_KEPUTUSAN_KDH', message: 'Status Lengkap mensyaratkan Target Cadangan Pangan Beras aktif untuk tahun ini beserta dokumen KEPUTUSAN_KDH berstatus Valid (mandat §6.3).' });
    } else {
      const kategoriTarget = await evidenceGate.kategoriValidSetUntukEntity('CADANGAN_TARGET', target.id, tenantId, transaction);
      if (!kategoriTarget.has('keputusan_kdh')) blockers.push({ code: 'PROSNP_EVIDENCE_GATE_KEPUTUSAN_KDH', message: 'Status Lengkap mensyaratkan dokumen KEPUTUSAN_KDH berstatus Valid (mandat §6.3).' });
      if (!kategoriTarget.has('kartu_stok') && !kategoriTarget.has('rekonsiliasi')) {
        blockers.push({ code: 'PROSNP_EVIDENCE_GATE_KARTU_STOK', message: 'Status Lengkap mensyaratkan dokumen KARTU_STOK atau REKONSILIASI_STOK berstatus Valid (mandat §6.3).' });
      }
    }
    if (row.rekonsiliasi_status === 'perlu_rekonsiliasi' && !row.rekonsiliasi_alasan) {
      blockers.push({ code: 'PROSNP_RECONCILIATION_REQUIRED', message: 'Terdapat selisih saldo antarsemester yang belum dijelaskan — isi alasan rekonsiliasi dan lampirkan bukti rekonsiliasi valid terlebih dahulu (mandat §9.2).' });
    }
  }
  if (row.indikator.tipe_form === 'capaian_persentase_bertingkat') {
    // Spek 34 §5/§6 langkah 6 (koreksi wajib #4): metadata sumber wajib diisi sebelum
    // Lengkap, bukan sumber_data teks bebas saja — supaya bisa diaudit lintas-OPD.
    if (row.target_nilai === null || row.target_nilai === undefined) blockers.push({ code: 'PROSNP_TARGET_BELUM_DIISI', message: 'Target/sasaran wajib diisi sebelum status Lengkap.' });
    if (row.realisasi_nilai === null || row.realisasi_nilai === undefined) blockers.push({ code: 'PROSNP_REALISASI_BELUM_DIISI', message: 'Realisasi/capaian wajib diisi sebelum status Lengkap.' });
    if (!row.sumber_data_tanggal_posisi || !row.sumber_data_referensi_dokumen) {
      blockers.push({ code: 'PROSNP_SUMBER_DATA_BELUM_LENGKAP', message: 'Tanggal posisi data dan referensi dokumen sumber wajib diisi sebelum status Lengkap (spek Indicator Foundation §3.5).' });
    }
  }

  if (row.skor_indikatif_internal === null || row.skor_indikatif_internal === undefined) {
    blockers.push({ code: 'PROSNP_SKOR_BELUM_DIHITUNG', message: 'Rule engine belum dijalankan — hitung ulang skor indikatif terlebih dahulu sebelum menandai Lengkap.' });
  }
  return blockers;
}

async function assertKelengkapanTipeBaru(row, tenantId, transaction) {
  const blockers = await collectKelengkapanBlockers(row, tenantId, transaction);
  if (blockers.length) throw new ProsnError(blockers[0].message, 409, blockers[0].code);
}

/**
 * Endpoint pre-check READ-ONLY (mandat §31/Req O) — tidak pernah mengubah
 * status, murni menampilkan SEMUA blocker sekaligus (bukan hanya yg pertama)
 * supaya user tahu persis apa yg harus dilengkapi sebelum mencoba Tandai
 * Lengkap. Requirement substantif TIDAK berubah — reuse `collectKelengkapanBlockers`
 * yg SAMA PERSIS dgn yg dipakai `assertKelengkapanTipeBaru`.
 */
async function checkCompletionReadiness(id, tenantId) {
  const row = await getPengisianScoped(id, tenantId, null);
  if (!TIPE_FORM_BARU.has(row.indikator.tipe_form)) return { ready: true, blockers: [] };
  const blockers = await collectKelengkapanBlockers(row, tenantId, null);
  return { ready: blockers.length === 0, blockers };
}

async function transitionPengisian(id, target, payload, actor, tenantId) {
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const row = await getPengisianScoped(id, tenantId, transaction);
    if (row.indikator.periode.status !== 'aktif') throw new ProsnError('Periode tidak aktif.', 409, 'PROSNP_PERIOD_LOCKED');
    if (!PHASE_1_TRANSITIONS[row.status]?.has(target)) throw new ProsnError('Transisi status Tahap 1 tidak diizinkan.', 409, 'PROSNP_TRANSITION_INVALID');
    if (row.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    if (target === 'lengkap') {
      assertRole(actor, OPERATOR_ROLES, 'Hanya Operator atau Administrator yang dapat menandai Lengkap.');
      if (!isAdmin(actor) && Number(row.diisi_oleh) !== Number(actor.id)) throw new ProsnError('Hanya pengisi asli yang dapat menandai Lengkap.', 403, 'PROSNP_NOT_OWNER');
      if (TIPE_FORM_BARU.has(row.indikator.tipe_form)) {
        await assertKelengkapanTipeBaru(row, tenantId, transaction);
      } else {
        validateForm(row.indikator, row.data_form);
        if (!row.sumber_data) throw new ProsnError('sumber_data wajib diisi sebelum status Lengkap.');
      }
    } else if (target === 'perlu_perbaikan') {
      assertRole(actor, REVIEWER_ROLES, 'Hanya Pemeriksa atau Administrator yang dapat meminta perbaikan.');
      if (!payload.alasan) throw new ProsnError('alasan wajib diisi saat meminta perbaikan.');
    } else if (target === 'siap_diinput_prosn') {
      if (!isInputOfficer(actor)) throw new ProsnError('Hanya Petugas Input atau Administrator yang dapat menandai siap input.', 403, 'PROSNP_FORBIDDEN');
      const review = await db.ProsnPemeriksaan.findOne({ where: { tenant_id: tenantId, pengisian_id: row.id, hasil: 'lengkap' }, order: [['putaran', 'DESC']], transaction });
      if (!review) throw new ProsnError('Pengisian harus memiliki hasil pemeriksaan Lengkap sebelum siap diinput.', 409, 'PROSNP_REVIEW_REQUIRED');
    } else if (target === 'diinput_manual') {
      if (!isInputOfficer(actor)) throw new ProsnError('Hanya Petugas Input atau Administrator yang dapat menandai input manual.', 403, 'PROSNP_FORBIDDEN');
      if (!payload.nomor_bukti_input) throw new ProsnError('nomor_bukti_input wajib diisi saat menandai input manual.');
    } else {
      assertRole(actor, OPERATOR_ROLES, 'Hanya Operator atau Administrator yang dapat memulai atau memperbaiki pengisian.');
      if (row.status === 'perlu_perbaikan' && !isAdmin(actor) && Number(row.diisi_oleh) !== Number(actor.id)) throw new ProsnError('Hanya pengisi asli yang dapat membuka perbaikan.', 403, 'PROSNP_NOT_OWNER');
    }
    const transitionValues = { status: target, updated_by: actor.id, lock_version: expectedVersion + 1 };
    if (target === 'siap_diinput_prosn') Object.assign(transitionValues, { siap_input_oleh: actor.id, siap_input_at: new Date() });
    if (target === 'diinput_manual') Object.assign(transitionValues, { input_manual_oleh: actor.id, input_manual_at: new Date(), nomor_bukti_input: payload.nomor_bukti_input });
    const [count] = await db.ProsnPengisian.update(transitionValues, { where: { id: row.id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    await db.ProsnRiwayatStatus.create({ tenant_id: tenantId, pengisian_id: row.id, status_sebelum: row.status, status_sesudah: target, alasan: payload.alasan || null, metadata: { phase: 1, lock_version: expectedVersion + 1 }, diubah_oleh: actor.id, diubah_at: new Date() }, { transaction });
    return getPengisianScoped(id, tenantId, transaction);
  });
}

async function listKategoriReferensi(kelompok) {
  const where = { aktif: true };
  if (kelompok) where.kelompok = kelompok;
  return db.ProsnKategoriReferensi.findAll({ where, order: [['kelompok', 'ASC'], ['urutan', 'ASC']] });
}

async function listAntrianPemeriksaan(tenantId) {
  return db.ProsnPengisian.findAll({
    where: { tenant_id: tenantId, status: 'lengkap' },
    include: [{
      model: db.ProsnIndikator,
      as: 'indikator',
      include: [{ model: db.ProsnPeriode, as: 'periode', include: [{ model: db.PerangkatDaerah, as: 'perangkatDaerah', attributes: ['id', 'nama'] }] }],
    }],
    order: [['diisi_at', 'ASC']],
  });
}

async function listPeriods(tenantId, filters = {}) {
  const where = { tenant_id: tenantId };
  if (filters.tahun) where.tahun = String(filters.tahun);
  if (filters.status) where.status = filters.status;
  return db.ProsnPeriode.findAll({
    where, order: [['tahun', 'DESC'], ['semester', 'ASC']],
    include: [{
      model: db.ProsnIndikator, as: 'indikators', attributes: ['id', 'kode', 'aktif', 'bobot_maksimal'],
      include: [{ model: db.ProsnPengisian, as: 'pengisian', attributes: ['id', 'status', 'skor_indikatif_internal'] }],
    }],
  });
}

const ENTITY_MODEL_BY_TYPE = {
  SURAT_PENUGASAN: 'ProsnSuratPenugasan',
  RAPAT_FORKOPIMDA: 'ProsnRapatForkopimda',
  CADANGAN_TARGET: null, // tenant/tahun-scoped, tidak per-pengisian — divalidasi terpisah
  STOK_TRANSAKSI: 'ProsnStokTransaksi',
  INOVASI: 'ProsnInovasi',
  PENGISIAN: null, // binding generik ke pengisian itu sendiri, tidak perlu entity_id
  SATGAS_MBG: 'ProsnSatgasMbg', // Indicator Foundation spek 34 §3.7
  LAPORAN_SATGAS_MBG: 'ProsnLaporanSatgasMbg',
};

/**
 * Evidence Binding per Record (mandat §5): pastikan entity_id yang ditunjuk
 * benar-benar milik pengisian yang sama — mencegah evidence "orphan" atau
 * menunjuk record pengisian lain (dua syarat wajib mandat: FK/validasi
 * referensial + entity tidak boleh lintas pengisian).
 */
async function assertEntityBinding(entityType, entityId, pengisianId, tenantId, transaction) {
  if (!entityType) return; // binding generik lama, tidak divalidasi lebih lanjut
  if (entityType === 'PENGISIAN') return;
  if (entityType === 'CADANGAN_TARGET') {
    const target = await db.ProsnCadanganTarget.findOne({ where: { id: entityId, tenant_id: tenantId }, transaction });
    if (!target) throw new ProsnError('Target Cadangan Pangan tidak ditemukan untuk binding bukti ini.', 404, 'PROSNP_EVIDENCE_ENTITY_NOT_FOUND');
    return;
  }
  const modelName = ENTITY_MODEL_BY_TYPE[entityType];
  if (!modelName) throw new ProsnError(`entity_type ${entityType} tidak dikenali.`, 400, 'PROSNP_EVIDENCE_ENTITY_TYPE_INVALID');
  const entity = await db[modelName].findOne({ where: { id: entityId, tenant_id: tenantId }, transaction });
  if (!entity) throw new ProsnError(`Record ${entityType} tidak ditemukan.`, 404, 'PROSNP_EVIDENCE_ENTITY_NOT_FOUND');
  if (Number(entity.pengisian_id) !== Number(pengisianId)) {
    throw new ProsnError(`Bukti tidak boleh menunjuk ${entityType} milik pengisian lain.`, 409, 'PROSNP_EVIDENCE_CROSS_PENGISIAN');
  }
}

async function createBukti(pengisianId, payload, file, actor, tenantId) {
  assertRole(actor, OPERATOR_ROLES, 'Hanya Operator atau Administrator yang dapat mengunggah bukti.');
  if (!file) throw new ProsnError('Berkas bukti wajib diunggah.', 422, 'PROSNP_FILE_REQUIRED');
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await getPengisianScoped(pengisianId, tenantId, transaction);
    if (!['belum_diisi', 'dalam_pengisian'].includes(pengisian.status)) throw new ProsnError('Bukti hanya dapat diubah saat pengisian terbuka.', 409, 'PROSNP_EDIT_LOCKED');
    if (!isAdmin(actor) && pengisian.diisi_oleh && Number(pengisian.diisi_oleh) !== Number(actor.id)) throw new ProsnError('Operator hanya dapat mengunggah bukti untuk pengisiannya.', 403, 'PROSNP_NOT_OWNER');
    const entityType = payload.entity_type || null;
    const entityId = payload.entity_id ? Number(payload.entity_id) : null;
    if (entityType && entityType !== 'PENGISIAN' && !entityId) throw new ProsnError('entity_id wajib diisi bila entity_type ditentukan.');
    await assertEntityBinding(entityType, entityId, pengisian.id, tenantId, transaction);

    const checksum = crypto.createHash('sha256').update(require('fs').readFileSync(file.path)).digest('hex');
    const bukti = await db.ProsnBuktiDukung.create({
      tenant_id: tenantId, periode_id: pengisian.indikator.periode_id, kelompok_uuid: crypto.randomUUID(), versi: 1,
      judul: payload.judul || file.originalname, jenis_bukti: payload.jenis_bukti || null, kategori: payload.kategori || null,
      nomor_dokumen: payload.nomor_dokumen || null, tanggal_dokumen: payload.tanggal_dokumen || null, sumber: payload.sumber || null,
      nama_asli: file.originalname, nama_tersimpan: file.filename, file_path: file.path, mime_type: file.mimetype,
      ukuran_byte: file.size, checksum_sha256: checksum, diunggah_oleh: actor.id, diunggah_at: new Date(),
    }, { transaction });

    if (entityType) {
      // Binding presisi: satu file -> satu indikator + satu entity spesifik (surat/rapat/transaksi/inovasi/target ini saja).
      await db.ProsnBuktiIndikator.create({
        tenant_id: tenantId, bukti_dukung_id: bukti.id, indikator_id: pengisian.indikator_id, pengisian_id: pengisian.id,
        entity_type: entityType, entity_id: entityType === 'PENGISIAN' ? null : entityId,
        relevansi: payload.relevansi || null, ditautkan_oleh: actor.id,
      }, { transaction });
      return bukti;
    }

    // Fallback lama: binding generik ke satu/banyak indikator (tanpa entity spesifik) — dipertahankan
    // demi kompatibilitas mundur, dipakai saat entity_type tidak dikirim sama sekali.
    let indikatorIds = payload.indikator_ids;
    if (typeof indikatorIds === 'string') { try { indikatorIds = JSON.parse(indikatorIds); } catch (_) { indikatorIds = indikatorIds.split(','); } }
    if (!Array.isArray(indikatorIds) || indikatorIds.length === 0) indikatorIds = [pengisian.indikator_id];
    const uniqueIds = [...new Set(indikatorIds.map((value) => Number(value)).filter(Number.isInteger))];
    const indikator = await db.ProsnIndikator.findAll({ where: { tenant_id: tenantId, periode_id: pengisian.indikator.periode_id, id: uniqueIds }, transaction });
    if (indikator.length !== uniqueIds.length) throw new ProsnError('Semua indikator bukti harus berada pada periode dan tenant yang sama.', 409, 'PROSNP_EVIDENCE_SCOPE_INVALID');
    await db.ProsnBuktiIndikator.bulkCreate(uniqueIds.map((indikator_id) => ({ tenant_id: tenantId, bukti_dukung_id: bukti.id, indikator_id, pengisian_id: pengisian.id, relevansi: payload.relevansi || null, ditautkan_oleh: actor.id })), { transaction });
    return bukti;
  });
}

async function listBuktiUntukEntity(pengisianId, entityType, entityId, tenantId) {
  const where = { pengisian_id: pengisianId, tenant_id: tenantId };
  if (entityType) where.entity_type = entityType;
  if (entityId) where.entity_id = Number(entityId);
  return db.ProsnBuktiIndikator.findAll({
    where,
    include: [{ model: db.ProsnBuktiDukung, as: 'buktiDukung', where: { status: ['aktif', 'perlu_perbaikan'] }, required: true }],
    order: [['created_at', 'DESC']],
  });
}

/** Verifikasi konten bukti (status_verifikasi) — terpisah dari checklist_status (kecocokan relasi) yang sudah ada. */
async function setStatusVerifikasiBukti(buktiId, payload, actor, tenantId) {
  assertRole(actor, REVIEWER_ROLES, 'Hanya Pemeriksa atau Administrator yang dapat memverifikasi bukti.');
  if (!['uploaded', 'valid', 'invalid', 'needs_clarification', 'duplicate', 'expired'].includes(payload.status_verifikasi)) {
    throw new ProsnError('status_verifikasi tidak valid.');
  }
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const bukti = await db.ProsnBuktiDukung.findOne({ where: { id: buktiId, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!bukti) throw new ProsnError('Bukti tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (bukti.lock_version !== expectedVersion) throw new ProsnError('Bukti telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    const [count] = await db.ProsnBuktiDukung.update({
      status_verifikasi: payload.status_verifikasi, catatan_pemeriksa: payload.catatan_pemeriksa || null,
      diperiksa_oleh: actor.id, diperiksa_at: new Date(), lock_version: expectedVersion + 1,
    }, { where: { id: buktiId, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Bukti telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    return db.ProsnBuktiDukung.findByPk(buktiId, { transaction });
  });
}

async function reviseBukti(buktiId, payload, file, actor, tenantId) {
  assertRole(actor, OPERATOR_ROLES, 'Hanya Operator atau Administrator yang dapat merevisi bukti.');
  if (!file) throw new ProsnError('Berkas versi baru wajib diunggah.', 422, 'PROSNP_FILE_REQUIRED');
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const lama = await db.ProsnBuktiDukung.findOne({ where: { id: buktiId, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!lama) throw new ProsnError('Bukti tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (lama.lock_version !== expectedVersion) throw new ProsnError('Bukti telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    const links = await db.ProsnBuktiIndikator.findAll({ where: { tenant_id: tenantId, bukti_dukung_id: lama.id }, transaction });
    const checksum = crypto.createHash('sha256').update(require('fs').readFileSync(file.path)).digest('hex');
    const baru = await db.ProsnBuktiDukung.create({
      tenant_id: tenantId, periode_id: lama.periode_id, kelompok_uuid: lama.kelompok_uuid, versi: lama.versi + 1,
      judul: payload.judul || lama.judul, jenis_bukti: payload.jenis_bukti || lama.jenis_bukti, kategori: lama.kategori,
      nomor_dokumen: lama.nomor_dokumen, tanggal_dokumen: lama.tanggal_dokumen, sumber: lama.sumber,
      nama_asli: file.originalname, nama_tersimpan: file.filename, file_path: file.path, mime_type: file.mimetype,
      ukuran_byte: file.size, checksum_sha256: checksum, menggantikan_bukti_id: lama.id, diunggah_oleh: actor.id,
      diunggah_at: new Date(), catatan: payload.catatan || null,
    }, { transaction });
    // Versi baru MEWARISI binding presisi (entity_type/entity_id/pengisian_id) dari versi lama —
    // revisi bukti tidak boleh diam-diam melepas ikatan ke record spesifiknya (mandat §5 "evidence
    // tetap aman saat record diganti/dihapus versinya").
    await db.ProsnBuktiIndikator.bulkCreate(links.map((link) => ({
      tenant_id: tenantId, bukti_dukung_id: baru.id, indikator_id: link.indikator_id, pengisian_id: link.pengisian_id,
      entity_type: link.entity_type, entity_id: link.entity_id, relevansi: link.relevansi, ditautkan_oleh: actor.id,
    })), { transaction });
    const [count] = await db.ProsnBuktiDukung.update({ status: 'digantikan', lock_version: expectedVersion + 1 }, { where: { id: lama.id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Bukti telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    return baru;
  });
}

async function checklistBukti(linkId, payload, actor, tenantId) {
  assertRole(actor, REVIEWER_ROLES, 'Hanya Pemeriksa atau Administrator yang dapat memeriksa bukti.');
  if (!['belum_dicek', 'sesuai', 'tidak_sesuai'].includes(payload.checklist_status)) throw new ProsnError('checklist_status tidak valid.');
  const expectedVersion = assertLockVersion(payload.lock_version);
  const link = await db.ProsnBuktiIndikator.findOne({ where: { id: linkId, tenant_id: tenantId } });
  if (!link) throw new ProsnError('Relasi bukti tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
  const [count] = await db.ProsnBuktiIndikator.update({ checklist_status: payload.checklist_status, catatan_kekurangan: payload.catatan_kekurangan || null, lock_version: expectedVersion + 1 }, { where: { id: link.id, tenant_id: tenantId, lock_version: expectedVersion } });
  if (count !== 1) throw new ProsnError('Checklist telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
  return db.ProsnBuktiIndikator.findByPk(link.id);
}

async function periksaPengisian(id, payload, actor, tenantId) {
  assertRole(actor, REVIEWER_ROLES, 'Hanya Pemeriksa atau Administrator yang dapat melakukan pemeriksaan.');
  const expectedVersion = assertLockVersion(payload.lock_version);
  if (!['lengkap', 'perlu_perbaikan'].includes(payload.hasil) || !['lengkap', 'tidak_lengkap', 'tidak_valid'].includes(payload.status_data) || !['lengkap', 'tidak_lengkap', 'tidak_valid'].includes(payload.status_bukti)) throw new ProsnError('Hasil pemeriksaan tidak valid.');
  if (payload.hasil === 'perlu_perbaikan' && !payload.catatan_kekurangan) throw new ProsnError('catatan_kekurangan wajib saat meminta perbaikan.');
  return db.sequelize.transaction(async (transaction) => {
    const row = await getPengisianScoped(id, tenantId, transaction);
    if (row.status !== 'lengkap') throw new ProsnError('Hanya pengisian berstatus Lengkap yang dapat diperiksa.', 409, 'PROSNP_REVIEW_INVALID_STATE');
    if (row.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    const putaran = (await db.ProsnPemeriksaan.max('putaran', { where: { tenant_id: tenantId, pengisian_id: row.id }, transaction }) || 0) + 1;
    await db.ProsnPemeriksaan.create({ tenant_id: tenantId, pengisian_id: row.id, putaran, hasil: payload.hasil, status_data: payload.status_data, status_bukti: payload.status_bukti, catatan_kekurangan: payload.catatan_kekurangan || null, diperiksa_oleh: actor.id, diperiksa_at: new Date() }, { transaction });
    // 'diperiksa' = state akhir terkonfirmasi Pemeriksa (mandat §15) — sebelumnya approve
    // membiarkan status tetap 'lengkap', membuat baris ini terus muncul di antrian pemeriksaan
    // padahal sudah disetujui; 'diperiksa' menandakan selesai diperiksa & tidak perlu ditinjau lagi.
    const target = payload.hasil === 'perlu_perbaikan' ? 'perlu_perbaikan' : 'diperiksa';
    const [count] = await db.ProsnPengisian.update({ status: target, updated_by: actor.id, lock_version: expectedVersion + 1 }, { where: { id: row.id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Data telah diubah pengguna lain.', 409, 'PROSNP_VERSION_CONFLICT');
    if (target !== row.status) await db.ProsnRiwayatStatus.create({ tenant_id: tenantId, pengisian_id: row.id, status_sebelum: row.status, status_sesudah: target, alasan: payload.catatan_kekurangan || null, metadata: { phase: 2, pemeriksaan_id: putaran }, diubah_oleh: actor.id, diubah_at: new Date() }, { transaction });
    return getPengisianScoped(id, tenantId, transaction);
  });
}

async function archivePeriod(id, payload, actor, tenantId) {
  if (!isInputOfficer(actor)) throw new ProsnError('Hanya Petugas Input atau Administrator yang dapat mengarsipkan periode.', 403, 'PROSNP_FORBIDDEN');
  return db.sequelize.transaction(async (transaction) => {
    const periode = await db.ProsnPeriode.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!periode) throw new ProsnError('Periode tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (periode.status !== 'aktif') throw new ProsnError('Hanya periode aktif yang dapat diarsipkan.', 409, 'PROSNP_ARCHIVE_INVALID_STATE');
    const indikator = await db.ProsnIndikator.findAll({ where: { tenant_id: tenantId, periode_id: id }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }], transaction });
    const summary = indikator.reduce((acc, item) => { const status = item.pengisian?.status || 'belum_diisi'; acc[status] = (acc[status] || 0) + 1; return acc; }, {});
    const snapshot_data = { schema_version: 1, archived_at: new Date().toISOString(), periode: periode.toJSON(), ringkasan_status: summary, indikator: indikator.map((item) => item.toJSON()), catatan_arsip: payload.catatan || null };
    const checksum_snapshot = crypto.createHash('sha256').update(JSON.stringify(snapshot_data)).digest('hex');
    const arsip = await db.ProsnArsip.create({ tenant_id: tenantId, periode_id: id, nomor_arsip: payload.nomor_arsip || `PROSNP-${periode.tahun}-${periode.semester}-${id}`, snapshot_data, checksum_snapshot, diarsipkan_oleh: actor.id, diarsipkan_at: new Date(), catatan: payload.catatan || null }, { transaction });
    const rows = await db.ProsnPengisian.findAll({ where: { tenant_id: tenantId }, include: [{ model: db.ProsnIndikator, as: 'indikator', where: { periode_id: id } }], transaction, lock: transaction.LOCK.UPDATE });
    for (const row of rows) {
      await row.update({ status: 'diarsipkan', lock_version: row.lock_version + 1, updated_by: actor.id }, { transaction });
      await db.ProsnRiwayatStatus.create({ tenant_id: tenantId, pengisian_id: row.id, status_sebelum: row.status, status_sesudah: 'diarsipkan', alasan: payload.catatan || 'Pengarsipan periode fleksibel.', metadata: { phase: 2, arsip_id: arsip.id }, diubah_oleh: actor.id, diubah_at: new Date() }, { transaction });
    }
    await periode.update({ status: 'diarsipkan', dikunci_at: new Date(), dikunci_oleh: actor.id, updated_by: actor.id }, { transaction });
    return { arsip, ringkasan_status: summary };
  });
}

async function reopenPeriod(id, payload, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat membuka kembali periode.', 403, 'PROSNP_FORBIDDEN');
  if (!payload.alasan) throw new ProsnError('alasan wajib diisi saat membuka kembali periode.');
  return db.sequelize.transaction(async (transaction) => {
    const periode = await db.ProsnPeriode.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!periode || periode.status !== 'diarsipkan') throw new ProsnError('Hanya periode terarsip yang dapat dibuka kembali.', 409, 'PROSNP_REOPEN_INVALID_STATE');
    const arsip = await db.ProsnArsip.findOne({ where: { tenant_id: tenantId, periode_id: id }, transaction });
    const statusAsal = new Map((arsip?.snapshot_data?.indikator || []).map((item) => [Number(item.id), item.pengisian?.status || 'belum_diisi']));
    const rows = await db.ProsnPengisian.findAll({ where: { tenant_id: tenantId }, include: [{ model: db.ProsnIndikator, as: 'indikator', where: { periode_id: id } }], transaction, lock: transaction.LOCK.UPDATE });
    for (const row of rows) {
      const target = statusAsal.get(Number(row.indikator_id)) || 'belum_diisi';
      await row.update({ status: target, lock_version: row.lock_version + 1, updated_by: actor.id }, { transaction });
      await db.ProsnRiwayatStatus.create({ tenant_id: tenantId, pengisian_id: row.id, status_sebelum: 'diarsipkan', status_sesudah: target, alasan: payload.alasan, metadata: { phase: 2, reopened_from_archive_id: arsip?.id || null }, diubah_oleh: actor.id, diubah_at: new Date() }, { transaction });
    }
    await periode.update({ status: 'aktif', dikunci_at: null, dikunci_oleh: null, catatan: [periode.catatan, `Dibuka kembali: ${payload.alasan}`].filter(Boolean).join('\n'), updated_by: actor.id }, { transaction });
    return periode;
  });
}

/**
 * "Ke SIAP_DIEKSPOR" (mandat §15, level periode): seluruh indikator aktif
 * B.1.1-B.1.4 harus sudah berstatus 'diperiksa' (dikonfirmasi Pemeriksa),
 * tidak ada yang tanpa status/masih draft.
 */
async function siapkanEksporPeriode(id, actor, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const periode = await db.ProsnPeriode.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!periode) throw new ProsnError('Periode tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (periode.status !== 'aktif') throw new ProsnError('Hanya periode aktif yang dapat ditandai siap ekspor.', 409, 'PROSNP_PERIOD_NOT_ACTIVE');
    const indikator = await db.ProsnIndikator.findAll({ where: { tenant_id: tenantId, periode_id: id, aktif: true }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }], transaction });
    if (!indikator.length) throw new ProsnError('Periode belum memiliki indikator aktif.', 409, 'PROSNP_INDICATOR_REQUIRED');
    const belum = indikator.filter((item) => item.pengisian?.status !== 'diperiksa');
    if (belum.length) {
      throw new ProsnError(
        `Belum semua indikator berstatus Diperiksa: ${belum.map((i) => `${i.kode} (${i.pengisian?.status || 'belum_diisi'})`).join(', ')}.`,
        409, 'PROSNP_NOT_ALL_REVIEWED',
      );
    }
    await periode.update({ status: 'siap_diekspor', updated_by: actor.id }, { transaction });
    return periode;
  });
}

module.exports = { ProsnError, createPeriod, updatePeriode, createIndikator, initializePeriodIndicators, activatePeriod, updatePengisian, transitionPengisian, listPeriods, listAntrianPemeriksaan, listKategoriReferensi, getPengisianScoped, createBukti, reviseBukti, checklistBukti, listBuktiUntukEntity, setStatusVerifikasiBukti, periksaPengisian, archivePeriod, reopenPeriod, siapkanEksporPeriode, isAdmin, checkCompletionReadiness,
  // Evidence & Operasi Pangan — Phase 1 (mandat §34): export tambahan MURNI,
  // tidak ada baris kode existing yang diubah. Dipakai foodOpsProsnBindingService
  // agar validasi binding entity/pengisian identik dgn jalur upload ProSN asli
  // (mandat §71 "evidence gate receives correct input").
  assertEntityBinding };
