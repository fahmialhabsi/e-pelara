'use strict';

/**
 * Evidence & Operasi Pangan — Phase 1 (mandat §28/§34 — internal ProSN
 * evidence binding). Integrasi INTERNAL satu-sistem (FoodOps <-> ProSN,
 * keduanya di e-PeLARA) — BUKAN bridge e-SIGAP (mandat §28: "This is
 * INTERNAL same-system integration. It is NOT the e-SIGAP bridge.").
 *
 * Strategi penyimpanan (mandat §34 "avoid binary duplication"): baris
 * `ProsnBuktiDukung` adapter yang dibuat di sini TIDAK menyalin berkas fisik
 * — `file_path` menunjuk path yang SAMA dengan `food_ops_document.file_path`
 * milik dokumen sumber. Validasi entity/pengisian MEREUSE
 * `assertEntityBinding`/`getPengisianScoped` dari prosnpWorkflowService.js
 * (export tambahan, tanpa perubahan logika) agar 100% konsisten dengan jalur
 * upload ProSN asli — rule engine/evidence gate ProSN sama sekali tidak
 * disentuh (mandat §29 "PROSN SCORING IS PROTECTED").
 */
const crypto = require('crypto');
const db = require('../../models');
const { FoodOpsError } = require('./foodOpsError');
const { getPengisianScoped, assertEntityBinding } = require('../prosnp/prosnpWorkflowService');

function assertLockVersion(value) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new FoodOpsError('lock_version wajib dikirim dari data terakhir.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  return result;
}

/** Ikat satu dokumen FoodOps ke satu indikator/entitas ProSN (mandat §30-33: berlaku sama utk B.1.1-B.1.4, tidak mengubah skor). */
async function bindDocumentToProsn(documentId, payload, actor, tenantId) {
  const pengisianId = payload.pengisian_id;
  const kategori = payload.kategori || null;
  if (!pengisianId) throw new FoodOpsError('pengisian_id wajib diisi.', 400, 'FOOD_OPS_INVALID_DOCUMENT');

  return db.sequelize.transaction(async (transaction) => {
    const document = await db.FoodOpsDocument.findOne({ where: { id: documentId, tenant_id: tenantId }, transaction });
    if (!document) throw new FoodOpsError('Dokumen tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');

    const pengisian = await getPengisianScoped(pengisianId, tenantId, transaction);

    const entityType = payload.entity_type || 'PENGISIAN';
    const entityId = entityType === 'PENGISIAN' ? null : Number(payload.entity_id);
    if (entityType !== 'PENGISIAN' && !entityId) throw new FoodOpsError('entity_id wajib diisi bila entity_type ditentukan.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
    await assertEntityBinding(entityType, entityId, pengisian.id, tenantId, transaction);

    // CORRECTIVE MANDATE UAT-01D §6 — pertahanan endpoint tulis: TIDAK BOLEH
    // hanya mengandalkan frontend (yang sebelumnya tidak membaca `already_bound`
    // dari findCandidates sama sekali — lihat perbaikan di
    // FoodOpsEvidenceCandidatePanel.jsx). Identitas "sudah tertaut" = tenant +
    // pengisian + entity_type + entity_id + food_ops_document_id yang SAMA
    // (mandat §2/§3 — food_ops_document_id sbg identitas kanonis, BUKAN judul/
    // filename/nomor_dokumen). `pengisian_id` WAJIB ikut discocokkan krn utk
    // entity_type='PENGISIAN', entity_id SELALU null — tanpa pengisian_id,
    // dokumen yg sudah dipakai di SATU pengisian akan salah dianggap "sudah
    // tertaut" utk pengisian LAIN yg sama sekali tidak terkait.
    const existingLink = await db.ProsnBuktiIndikator.findOne({
      where: { tenant_id: tenantId, pengisian_id: pengisian.id, entity_type: entityType, entity_id: entityId },
      include: [{ model: db.ProsnBuktiDukung, as: 'buktiDukung', attributes: ['id', 'food_ops_document_id'], where: { food_ops_document_id: documentId }, required: true }],
      transaction,
    });
    if (existingLink) {
      throw new FoodOpsError(
        'Dokumen ini sudah ditautkan sebagai bukti untuk target ProSN yang sama. Tidak perlu menautkan ulang.',
        409,
        'FOOD_OPS_PROSN_BINDING_ALREADY_EXISTS',
        { existing_link_id: existingLink.id, existing_bukti_dukung_id: existingLink.bukti_dukung_id },
      );
    }

    const bukti = await db.ProsnBuktiDukung.create({
      tenant_id: tenantId,
      periode_id: pengisian.indikator.periode_id,
      kelompok_uuid: crypto.randomUUID(),
      versi: 1,
      judul: document.judul,
      jenis_bukti: null,
      kategori,
      nomor_dokumen: document.nomor_dokumen,
      tanggal_dokumen: document.tanggal_dokumen,
      sumber: 'FOOD_OPS_REGISTRY',
      nama_asli: document.file_name_original,
      nama_tersimpan: document.file_name_stored,
      file_path: document.file_path,
      mime_type: document.mime_type,
      ukuran_byte: document.ukuran_byte,
      checksum_sha256: document.checksum_sha256,
      status: 'aktif',
      status_verifikasi: document.status_verifikasi,
      food_ops_document_id: document.id,
      diunggah_oleh: actor.id,
      diunggah_at: new Date(),
    }, { transaction });

    const link = await db.ProsnBuktiIndikator.create({
      tenant_id: tenantId,
      bukti_dukung_id: bukti.id,
      indikator_id: pengisian.indikator_id,
      pengisian_id: pengisian.id,
      entity_type: entityType,
      entity_id: entityId,
      relevansi: payload.relevansi || null,
      ditautkan_oleh: actor.id,
    }, { transaction });

    // Audit trail (micro corrective — mandat "FoodOps <-> ProSN Binding
    // ActivityLog"): REUSE arsitektur ActivityLog existing (pola identik
    // prosnpMasterIndikatorService.js), SATU transaksi dgn penulisan
    // binding itu sendiri — bind sukses TANPA audit sukses tidak boleh commit.
    // activity_logs tidak punya kolom tenant_id (mandat: jangan menambah
    // skema) — tenant_id disertakan di dalam new_data agar tetap terlacak.
    await db.ActivityLog.create({
      user_id: actor.id,
      action: 'food_ops_prosn_bind',
      entity_type: 'PROSN_BUKTI_INDIKATOR',
      entity_id: link.id,
      old_data: null,
      new_data: {
        tenant_id: tenantId,
        food_ops_document_id: document.id,
        bukti_dukung_id: bukti.id,
        pengisian_id: pengisian.id,
        indikator_id: pengisian.indikator_id,
        prosn_entity_type: entityType,
        prosn_entity_id: entityId,
        kategori,
        relevansi: payload.relevansi || null,
      },
    }, { transaction });

    return { bukti, link };
  });
}

/** Lepas ikatan — TIDAK menghapus dokumen sumber FoodOps (mandat §34 "unbind does not delete source document"). */
async function unbindFromProsn(buktiIndikatorId, tenantId, actor) {
  return db.sequelize.transaction(async (transaction) => {
    const link = await db.ProsnBuktiIndikator.findOne({
      where: { id: buktiIndikatorId, tenant_id: tenantId },
      include: [{ model: db.ProsnBuktiDukung, as: 'buktiDukung' }],
      transaction,
    });
    if (!link) throw new FoodOpsError('Tautan bukti tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');
    if (!link.buktiDukung || !link.buktiDukung.food_ops_document_id) {
      throw new FoodOpsError('Tautan ini bukan berasal dari Evidence & Operasi Pangan.', 409, 'FOOD_OPS_INVALID_SOURCE');
    }
    // Snapshot identitas relasi SEBELUM dihapus — audit unbind harus tetap bisa
    // merekonstruksi relasi yang dilepas walau baris link-nya sudah tidak ada.
    const removedSnapshot = {
      tenant_id: tenantId,
      food_ops_document_id: link.buktiDukung.food_ops_document_id,
      bukti_dukung_id: link.buktiDukung.id,
      pengisian_id: link.pengisian_id,
      indikator_id: link.indikator_id,
      prosn_entity_type: link.entity_type,
      prosn_entity_id: link.entity_id,
      kategori: link.buktiDukung.kategori,
    };
    await link.buktiDukung.update({ status: 'dibatalkan', lock_version: link.buktiDukung.lock_version + 1, updated_by: actor.id }, { transaction });
    const removedId = link.id;
    await link.destroy({ transaction });

    await db.ActivityLog.create({
      user_id: actor.id,
      action: 'food_ops_prosn_unbind',
      entity_type: 'PROSN_BUKTI_INDIKATOR',
      entity_id: removedId,
      old_data: removedSnapshot,
      new_data: null,
    }, { transaction });

    // pengisian_id ditambahkan ke return value (sebelumnya hanya { id }) semata
    // utk auto-recalc skor pasca-unbind (mandat "Automatic Scoring" §20) — tidak
    // ada caller lama yg bergantung pada shape sebelumnya.
    return { id: removedId, pengisian_id: removedSnapshot.pengisian_id };
  });
}

/** Daftar binding ProSN yang berasal dari satu dokumen FoodOps (utk tampilan Document Detail). */
async function listBindingsForDocument(documentId, tenantId) {
  const document = await db.FoodOpsDocument.findOne({ where: { id: documentId, tenant_id: tenantId } });
  if (!document) throw new FoodOpsError('Dokumen tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');

  return db.ProsnBuktiIndikator.findAll({
    where: { tenant_id: tenantId },
    include: [
      { model: db.ProsnBuktiDukung, as: 'buktiDukung', where: { food_ops_document_id: documentId, tenant_id: tenantId }, required: true },
      { model: db.ProsnIndikator, as: 'indikator', attributes: ['id', 'kode', 'nama'] },
    ],
    order: [['created_at', 'DESC']],
  });
}

module.exports = { bindDocumentToProsn, unbindFromProsn, listBindingsForDocument, assertLockVersion };
