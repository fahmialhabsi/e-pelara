'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0 (mandat §29). Registry dokumen/evidence
 * generik: upload/register, versioning append-only, checksum, klasifikasi,
 * ekstraksi teks (REUSE `prosnpDocumentTextExtractor.extractTextFromFile`,
 * TIDAK membuat OCR/parser baru — mandat §25).
 */
const fs = require('fs');
const crypto = require('crypto');
const db = require('../../models');
const { FoodOpsError } = require('./foodOpsError');
const { extractTextFromFile } = require('../prosnp/autofill/prosnpDocumentTextExtractor');
const { classifyFoodOpsDocument, FOOD_OPS_DOCUMENT_TYPES } = require('./foodOpsClassifier');

const DOCUMENT_CLASSES = new Set(['REGULATION', 'OPERATIONAL_EVIDENCE', 'ACTIVITY_DOCUMENT', 'REPORT', 'OTHER']);
const DOCUMENT_TYPES = new Set(FOOD_OPS_DOCUMENT_TYPES);

function assertLockVersion(value) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new FoodOpsError('lock_version wajib dikirim dari data terakhir.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  return result;
}

function validateCreatePayload(payload) {
  if (!payload.judul) throw new FoodOpsError('Judul dokumen wajib diisi.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  if (!DOCUMENT_CLASSES.has(payload.document_class)) throw new FoodOpsError('document_class tidak valid.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  if (!DOCUMENT_TYPES.has(payload.document_type)) throw new FoodOpsError('document_type tidak dikenali.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
}

function computeChecksum(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function findDuplicateByChecksum(tenantId, checksum, transaction) {
  return db.FoodOpsDocument.findOne({
    where: { tenant_id: tenantId, checksum_sha256: checksum, status: ['aktif', 'perlu_perbaikan'] },
    transaction,
  });
}

/**
 * Corrective "ProSN Semester-II Readiness — Canonical Duplicate Guard Tier
 * Distinction" (mandat Req #1) — tier "LIKELY SAME DOCUMENT": identitas
 * metadata KUAT (nomor_dokumen EKSAK sama) TAPI checksum berkas berbeda —
 * BUKAN duplikat pasti (mis. hasil scan ulang/kompresi berbeda dari dokumen
 * fisik yang sama), jadi TIDAK PERNAH memblokir (beda dgn EXACT/checksum yg
 * memblokir) — murni PERINGATAN + tawaran kandidat existing, keputusan akhir
 * tetap di user (mandat: "warn user, offer existing source candidate, allow
 * explicit decision"). Reuse tabel & scoping yg SAMA dgn findDuplicateByChecksum
 * — TIDAK membuat mesin fuzzy-dedup baru.
 */
async function findLikelySameDocument(tenantId, nomorDokumen, excludeChecksum, transaction) {
  if (!nomorDokumen || !String(nomorDokumen).trim()) return null;
  const where = { tenant_id: tenantId, nomor_dokumen: String(nomorDokumen).trim(), status: ['aktif', 'perlu_perbaikan'] };
  if (excludeChecksum) where.checksum_sha256 = { [db.Sequelize.Op.ne]: excludeChecksum };
  return db.FoodOpsDocument.findOne({ where, transaction });
}

/** Mandat §29/§74 — STORE ONCE: cek duplikat sebelum menyimpan baris baru, TIDAK menghapus/menimpa yang lama. */
async function createDocument(payload, file, actor, tenantId) {
  validateCreatePayload(payload);
  if (!file) throw new FoodOpsError('Berkas dokumen wajib diunggah.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  const checksum = computeChecksum(file.path);

  return db.sequelize.transaction(async (transaction) => {
    const duplikat = await findDuplicateByChecksum(tenantId, checksum, transaction);
    const created = await db.FoodOpsDocument.create({
      tenant_id: tenantId,
      kelompok_uuid: crypto.randomUUID(),
      versi: 1,
      document_class: payload.document_class,
      document_type: payload.document_type,
      judul: payload.judul,
      nomor_dokumen: payload.nomor_dokumen || null,
      tanggal_dokumen: payload.tanggal_dokumen || null,
      penerbit: payload.penerbit || null,
      file_name_original: file.originalname,
      file_name_stored: file.filename,
      file_path: file.path,
      mime_type: file.mimetype,
      ukuran_byte: file.size,
      checksum_sha256: checksum,
      authority_level: payload.authority_level || null,
      generated_status: null,
      created_by: actor.id,
      updated_by: actor.id,
    }, { transaction });
    return { document: created, duplicate_of: duplikat ? { id: duplikat.id, judul: duplikat.judul, checksum_sha256: duplikat.checksum_sha256 } : null };
  });
}

async function listDocuments(tenantId, query = {}) {
  const where = { tenant_id: tenantId };
  if (query.document_class) where.document_class = query.document_class;
  if (query.document_type) where.document_type = query.document_type;
  if (query.status_verifikasi) where.status_verifikasi = query.status_verifikasi;
  if (query.tahun) where.tanggal_dokumen = db.Sequelize.where(db.Sequelize.fn('YEAR', db.Sequelize.col('tanggal_dokumen')), query.tahun);
  where.status = { [db.Sequelize.Op.ne]: 'digantikan' };
  return db.FoodOpsDocument.findAll({ where, order: [['created_at', 'DESC']] });
}

async function getDocumentDetail(id, tenantId) {
  const row = await db.FoodOpsDocument.findOne({ where: { id, tenant_id: tenantId } });
  if (!row) throw new FoodOpsError('Dokumen tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');
  return row;
}

async function getDocumentVersionHistory(id, tenantId) {
  const current = await getDocumentDetail(id, tenantId);
  return db.FoodOpsDocument.findAll({ where: { tenant_id: tenantId, kelompok_uuid: current.kelompok_uuid }, order: [['versi', 'ASC']] });
}

/** Mandat §7 — append-only: baris lama TIDAK ditimpa, hanya status->'digantikan'. */
async function createNewVersion(id, payload, file, actor, tenantId) {
  if (!file) throw new FoodOpsError('Berkas versi baru wajib diunggah.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  const checksum = computeChecksum(file.path);

  return db.sequelize.transaction(async (transaction) => {
    const lama = await db.FoodOpsDocument.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!lama) throw new FoodOpsError('Dokumen tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');

    const baru = await db.FoodOpsDocument.create({
      tenant_id: tenantId,
      kelompok_uuid: lama.kelompok_uuid,
      versi: lama.versi + 1,
      document_class: lama.document_class,
      document_type: lama.document_type,
      judul: payload?.judul || lama.judul,
      nomor_dokumen: payload?.nomor_dokumen ?? lama.nomor_dokumen,
      tanggal_dokumen: payload?.tanggal_dokumen ?? lama.tanggal_dokumen,
      penerbit: payload?.penerbit ?? lama.penerbit,
      file_name_original: file.originalname,
      file_name_stored: file.filename,
      file_path: file.path,
      mime_type: file.mimetype,
      ukuran_byte: file.size,
      checksum_sha256: checksum,
      menggantikan_document_id: lama.id,
      authority_level: lama.authority_level,
      created_by: actor.id,
      updated_by: actor.id,
    }, { transaction });

    await lama.update({ status: 'digantikan', updated_by: actor.id, lock_version: lama.lock_version + 1 }, { transaction });
    return baru;
  });
}

async function verifyDocument(id, payload, actor, tenantId) {
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const row = await db.FoodOpsDocument.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw new FoodOpsError('Dokumen tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');
    if (row.lock_version !== expectedVersion) throw new FoodOpsError('Dokumen telah diubah pengguna lain.', 409, 'FOOD_OPS_LOCK_CONFLICT');
    const [count] = await db.FoodOpsDocument.update(
      { status_verifikasi: payload.status_verifikasi, updated_by: actor.id, lock_version: expectedVersion + 1 },
      { where: { id, tenant_id: tenantId, lock_version: expectedVersion }, transaction },
    );
    if (count !== 1) throw new FoodOpsError('Dokumen telah diubah pengguna lain.', 409, 'FOOD_OPS_LOCK_CONFLICT');
    return db.FoodOpsDocument.findByPk(id, { transaction });
  });
}

/** Ekstraksi teks — REUSE murni, tidak menyalin logika OCR/parser (mandat §25). */
async function extractDocumentText(id, tenantId) {
  const row = await getDocumentDetail(id, tenantId);
  const result = await extractTextFromFile({ file_path: row.file_path, mime_type: row.mime_type });
  if (result.extractFailed) return { document: row, extraction: result };
  await db.FoodOpsDocument.update(
    { extracted_text_cache: result.text, extracted_at: new Date(), extraction_method: result.method },
    { where: { id, tenant_id: tenantId } },
  );
  return { document: await db.FoodOpsDocument.findByPk(id), extraction: result };
}

/** Klasifikasi — REUSE algoritma zone-split ProSN, tipe/aturan module-owned (mandat §26/§27). */
async function classifyDocumentById(id, tenantId) {
  const row = await getDocumentDetail(id, tenantId);
  let text = row.extracted_text_cache;
  if (!text) {
    const extraction = await extractDocumentText(id, tenantId);
    text = extraction.document.extracted_text_cache;
  }
  const hasil = classifyFoodOpsDocument(text || '');
  await db.FoodOpsDocument.update({ klasifikasi_meta: hasil }, { where: { id, tenant_id: tenantId } });
  return hasil;
}

/**
 * Phase 1 (mandat §9) — ringkasan dashboard registry, SELURUH angka dihitung
 * langsung dari tabel (bukan KPI karangan). `tahun` opsional memfilter
 * dokumen (via tanggal_dokumen) dan kegiatan sekaligus.
 */
async function getDashboardSummary(tenantId, query = {}) {
  const documentWhere = { tenant_id: tenantId, status: { [db.Sequelize.Op.ne]: 'digantikan' } };
  if (query.document_class) documentWhere.document_class = query.document_class;
  if (query.tahun) documentWhere.tanggal_dokumen = db.Sequelize.where(db.Sequelize.fn('YEAR', db.Sequelize.col('tanggal_dokumen')), query.tahun);

  const [totalDokumenAktif, dokumenMenungguVerifikasi, dokumenValid, dokumenPerluKlarifikasi, dokumenSuperseded, regulasiAktif, kegiatanPeriodeBerjalan, activeDocuments, linkedRows, boundRows] = await Promise.all([
    db.FoodOpsDocument.count({ where: documentWhere }),
    db.FoodOpsDocument.count({ where: { ...documentWhere, status_verifikasi: ['uploaded', 'needs_clarification'] } }),
    db.FoodOpsDocument.count({ where: { ...documentWhere, status_verifikasi: 'valid' } }),
    db.FoodOpsDocument.count({ where: { ...documentWhere, status_verifikasi: 'needs_clarification' } }),
    db.FoodOpsDocument.count({ where: { tenant_id: tenantId, status: 'digantikan' } }),
    db.FoodOpsRegulationMeta.count({ where: { tenant_id: tenantId, status_berlaku: 'berlaku' } }),
    db.FoodOpsEvent.count({ where: { tenant_id: tenantId, status: 'aktif', ...(query.tahun ? { tahun: String(query.tahun) } : {}) } }),
    db.FoodOpsDocument.findAll({ where: documentWhere, attributes: ['id', 'status_verifikasi'] }),
    db.FoodOpsDocumentLink.findAll({ where: { tenant_id: tenantId }, attributes: ['document_id'], group: ['document_id'] }),
    db.ProsnBuktiDukung.findAll({ where: { tenant_id: tenantId, food_ops_document_id: { [db.Sequelize.Op.ne]: null } }, attributes: ['food_ops_document_id'], group: ['food_ops_document_id'] }),
  ]);

  const linkedIds = new Set(linkedRows.map((r) => r.document_id));
  const boundIds = new Set(boundRows.map((r) => r.food_ops_document_id));
  const evidenceBelumTertaut = activeDocuments.filter((d) => !linkedIds.has(d.id)).length;
  const evidenceCandidateProsn = activeDocuments.filter((d) => !boundIds.has(d.id) && d.status_verifikasi !== 'invalid' && d.status_verifikasi !== 'expired').length;

  return {
    total_dokumen_aktif: totalDokumenAktif,
    dokumen_menunggu_verifikasi: dokumenMenungguVerifikasi,
    dokumen_valid: dokumenValid,
    dokumen_perlu_klarifikasi: dokumenPerluKlarifikasi,
    dokumen_superseded: dokumenSuperseded,
    regulasi_aktif: regulasiAktif,
    kegiatan_periode_berjalan: kegiatanPeriodeBerjalan,
    evidence_belum_tertaut: evidenceBelumTertaut,
    evidence_candidate_prosn: evidenceCandidateProsn,
  };
}

module.exports = {
  DOCUMENT_CLASSES,
  DOCUMENT_TYPES,
  computeChecksum,
  findDuplicateByChecksum,
  findLikelySameDocument,
  createDocument,
  listDocuments,
  getDocumentDetail,
  getDocumentVersionHistory,
  createNewVersion,
  verifyDocument,
  extractDocumentText,
  classifyDocumentById,
  getDashboardSummary,
};
