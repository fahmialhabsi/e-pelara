'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0 (mandat §31). CRUD kegiatan/aktivitas
 * operasional generik. TIDAK ADA logika upload dokumen di sini (mandat
 * §31 eksplisit) — linking evidence dilakukan lewat foodOpsDocumentLinkService.
 */
const db = require('../../models');
const { FoodOpsError } = require('./foodOpsError');

const EVENT_TYPES = new Set(['RAPAT', 'RAKOR', 'MONITORING', 'SOSIALISASI', 'SERAH_TERIMA', 'STOCK_OPNAME', 'PENYALURAN', 'KEGIATAN_LAIN']);

// CORRECTIVE MANDATE UAT-03 §8 — penanda relation_type KHUSUS utk baris
// FoodOpsDocumentLink yang berarti "dokumen ini adalah SUMBER pembuatan
// Kegiatan ini" — SENGAJA berbeda dari relation_type bebas yang bisa diisi
// user lewat FoodOpsDocumentLinkManager ("+ Tautkan", mis. "EVIDENCE") agar
// TIDAK tertukar dengan tautan evidence biasa (yang tidak berarti "sumber
// pembuatan"). Reuse tabel `food_ops_document_link` yang SUDAH ADA (mandat
// §22 "reuse if existing architecture solves it") — TIDAK ADA migrasi baru.
const KEGIATAN_SOURCE_RELATION_TYPE = 'KEGIATAN_SOURCE';

function assertLockVersion(value) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new FoodOpsError('lock_version wajib dikirim dari data terakhir.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  return result;
}

function validatePayload(payload) {
  if (!payload.nama_kegiatan) throw new FoodOpsError('Nama kegiatan wajib diisi.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  if (!EVENT_TYPES.has(payload.event_type)) throw new FoodOpsError('event_type tidak dikenali.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  if (!payload.tanggal_mulai) throw new FoodOpsError('Tanggal mulai kegiatan wajib diisi.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  if (!payload.tahun) throw new FoodOpsError('Tahun kegiatan wajib diisi.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
}

/** Mandat §4/§5 — Tahun kegiatan sumber-dokumen HARUS merepresentasikan tahun tanggal_mulai, bukan tahun sistem/klien. */
function deriveTahunFromTanggalMulai(tanggalMulai) {
  const match = /^(\d{4})/.exec(String(tanggalMulai || ''));
  return match ? match[1] : null;
}

function buildEventFields(payload, tahun) {
  return {
    opd_id: payload.opd_id || null,
    tahun: String(tahun),
    event_type: payload.event_type,
    tanggal_mulai: payload.tanggal_mulai,
    tanggal_selesai: payload.tanggal_selesai || null,
    nama_kegiatan: payload.nama_kegiatan,
    lokasi: payload.lokasi || null,
    pimpinan: payload.pimpinan || null,
    penanggung_jawab: payload.penanggung_jawab || null,
    agenda: payload.agenda || null,
    hasil: payload.hasil || null,
    tindak_lanjut: payload.tindak_lanjut || null,
    status_tindak_lanjut: payload.status_tindak_lanjut || 'belum_ditindaklanjuti',
  };
}

/**
 * CORRECTIVE MANDATE UAT-03 — `payload.source_document_id` OPSIONAL/ADITIF
 * (mandat §2): saat diisi, kegiatan ini dianggap "source-driven" (dibuat
 * lewat "Isi Otomatis dari Dokumen Existing"), dan DUA invarian baru
 * ditegakkan SEBELUM baris apa pun ditulis:
 *
 * 1) Tahun-consistency (mandat §5, defense-in-depth di belakang perbaikan
 *    frontend §4 — backend TIDAK PERNAH mempercayai `tahun` dari klien
 *    begitu saja utk jalur ini): dinormalisasi ulang dari tahun
 *    `tanggal_mulai`, BUKAN nilai `tahun` yang dikirim klien.
 * 2) Duplicate-source guard (mandat §8/§9/§11): identitas sumber = LINEAGE
 *    dokumen (`kelompok_uuid`), BUKAN baris versi spesifik — mencegah versi
 *    baru (mis. V3) dari lineage yang SAMA dipakai membuat Kegiatan lagi
 *    setelah lineage itu pernah dipakai (V1/V2/dst.), krn `listDocuments`
 *    yang mengisi dropdown kandidat HANYA menampilkan versi AKTIF (bukan yg
 *    sudah digantikan) — begitu satu versi dipakai, versi berikutnya dalam
 *    lineage yg sama harus tetap dikenali sbg "sudah terdaftar". Jika
 *    ditemukan tautan `KEGIATAN_SOURCE` yang SUDAH ADA utk lineage ini ->
 *    409 FOOD_OPS_EVENT_SOURCE_ALREADY_REGISTERED, ZERO baris ditulis.
 *
 * Kegiatan manual (`source_document_id` tidak dikirim) TIDAK terpengaruh
 * sama sekali — perilaku PERSIS seperti sebelumnya (mandat §12).
 */
async function createEvent(payload, actor, tenantId) {
  validatePayload(payload);

  if (!payload.source_document_id) {
    return db.FoodOpsEvent.create({
      tenant_id: tenantId,
      ...buildEventFields(payload, payload.tahun),
      created_by: actor.id,
      updated_by: actor.id,
    });
  }

  const sourceDocumentId = Number(payload.source_document_id);
  return db.sequelize.transaction(async (transaction) => {
    const sourceDocument = await db.FoodOpsDocument.findOne({ where: { id: sourceDocumentId, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!sourceDocument) throw new FoodOpsError('Dokumen sumber tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');

    // Mandat §21 — kunci SELURUH lineage (bukan hanya baris sourceDocument),
    // pola SAMA PERSIS dgn race-safe version numbering UAT-01C: dua request
    // konkuren yang menargetkan document_id BERBEDA dlm satu kelompok_uuid
    // yang SAMA tetap terserialisasi, sehingga pengecekan "sudah terdaftar"
    // di bawah selalu membaca state ter-commit terbaru, bukan snapshot basi.
    const lineageDocs = await db.FoodOpsDocument.findAll({ where: { tenant_id: tenantId, kelompok_uuid: sourceDocument.kelompok_uuid }, attributes: ['id'], transaction, lock: transaction.LOCK.UPDATE });
    const lineageIds = lineageDocs.map((d) => d.id);

    const existingSourceLink = await db.FoodOpsDocumentLink.findOne({
      where: { tenant_id: tenantId, document_id: lineageIds, entity_type: 'EVENT', relation_type: KEGIATAN_SOURCE_RELATION_TYPE },
      transaction,
    });
    if (existingSourceLink) {
      throw new FoodOpsError(
        'Dokumen sumber ini sudah pernah dipakai untuk membuat Kegiatan lain. Gunakan Kegiatan yang sudah ada, jangan buat lagi.',
        409,
        'FOOD_OPS_EVENT_SOURCE_ALREADY_REGISTERED',
        { existing_link_id: existingSourceLink.id, existing_entity_id: existingSourceLink.entity_id },
      );
    }

    const tahun = deriveTahunFromTanggalMulai(payload.tanggal_mulai) || payload.tahun;
    const event = await db.FoodOpsEvent.create({
      tenant_id: tenantId,
      ...buildEventFields(payload, tahun),
      created_by: actor.id,
      updated_by: actor.id,
    }, { transaction });

    await db.FoodOpsDocumentLink.create({
      tenant_id: tenantId,
      document_id: sourceDocumentId,
      entity_type: 'EVENT',
      entity_id: event.id,
      relation_type: KEGIATAN_SOURCE_RELATION_TYPE,
      linked_by: actor.id,
      linked_at: new Date(),
    }, { transaction });

    return event;
  });
}

async function listEvents(tenantId, query = {}) {
  const where = { tenant_id: tenantId, status: 'aktif' };
  if (query.tahun) where.tahun = String(query.tahun);
  if (query.event_type) where.event_type = query.event_type;
  if (query.opd_id) where.opd_id = query.opd_id;
  return db.FoodOpsEvent.findAll({ where, order: [['tanggal_mulai', 'DESC']] });
}

async function getEventDetail(id, tenantId) {
  const row = await db.FoodOpsEvent.findOne({ where: { id, tenant_id: tenantId } });
  if (!row) throw new FoodOpsError('Kegiatan tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');
  return row;
}

async function updateEvent(id, payload, actor, tenantId) {
  validatePayload(payload);
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const row = await db.FoodOpsEvent.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw new FoodOpsError('Kegiatan tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');
    if (row.lock_version !== expectedVersion) throw new FoodOpsError('Data telah diubah pengguna lain.', 409, 'FOOD_OPS_LOCK_CONFLICT');
    const [count] = await db.FoodOpsEvent.update({
      opd_id: payload.opd_id || null,
      tahun: String(payload.tahun),
      event_type: payload.event_type,
      tanggal_mulai: payload.tanggal_mulai,
      tanggal_selesai: payload.tanggal_selesai || null,
      nama_kegiatan: payload.nama_kegiatan,
      lokasi: payload.lokasi || null,
      pimpinan: payload.pimpinan || null,
      penanggung_jawab: payload.penanggung_jawab || null,
      agenda: payload.agenda || null,
      hasil: payload.hasil || null,
      tindak_lanjut: payload.tindak_lanjut || null,
      status_tindak_lanjut: payload.status_tindak_lanjut || row.status_tindak_lanjut,
      updated_by: actor.id,
      lock_version: expectedVersion + 1,
    }, { where: { id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new FoodOpsError('Data telah diubah pengguna lain.', 409, 'FOOD_OPS_LOCK_CONFLICT');
    return db.FoodOpsEvent.findByPk(id, { transaction });
  });
}

module.exports = { EVENT_TYPES, KEGIATAN_SOURCE_RELATION_TYPE, deriveTahunFromTanggalMulai, createEvent, listEvents, getEventDetail, updateEvent };
