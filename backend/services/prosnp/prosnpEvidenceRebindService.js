'use strict';

/**
 * Spesifikasi 35 v3 §7 Phase E + §31 — Evidence Binding (rebind bukti staging
 * PENGISIAN ke entity register spesifik) + primitive serialization staging-row
 * yang dipakai ULANG oleh `/autofill-apply` (Fase 5, STEP 2 §31) supaya guard
 * konkurensi P0 sudah tersedia sejak Fase 2, bukan ditambal belakangan.
 *
 * `ENTITY_MODEL_BY_TYPE`/kategori-per-entityType SENGAJA diduplikasi di sini
 * (bukan di-import) karena `prosnpWorkflowService.js` berstatus REUSE, TIDAK
 * DIUBAH (§26/§41 File Impact Matrix) — menambah export baru ke file itu
 * dianggap modifikasi yang dilarang mandat.
 */
const db = require('../../models');
const { ProsnError } = require('./prosnpWorkflowService');

const ENTITY_MODEL_BY_TYPE = {
  SURAT_PENUGASAN: 'ProsnSuratPenugasan',
  RAPAT_FORKOPIMDA: 'ProsnRapatForkopimda',
  CADANGAN_TARGET: null, // tenant/tahun-scoped, tidak per-pengisian — ditangani terpisah
  STOK_TRANSAKSI: 'ProsnStokTransaksi',
  INOVASI: 'ProsnInovasi',
};

const KATEGORI_VALID_BY_ENTITY_TYPE = {
  SURAT_PENUGASAN: ['surat_penugasan', 'bukti_tindak_lanjut'],
  RAPAT_FORKOPIMDA: ['undangan', 'daftar_hadir', 'notulen', 'dokumentasi', 'berita_acara'],
  CADANGAN_TARGET: ['keputusan_kdh', 'kartu_stok', 'rekonsiliasi'],
  STOK_TRANSAKSI: ['dokumen_pengadaan', 'bukti_penerimaan', 'dokumen_penyaluran', 'berita_acara', 'dokumen_penetapan', 'dokumen_koreksi'],
  INOVASI: ['bukti_implementasi', 'perkada', 'bukti_hasil'],
};

/**
 * §31 STEP 2 — canonical serialization lock. Baris ini SUDAH ADA sejak Phase A
 * (upload staging, `entity_type='PENGISIAN'`) — mengunci baris nyata, bukan
 * baris target yang belum tentu ada (root cause defect desain v2, diperbaiki
 * v3). WAJIB dipanggil di dalam transaction yang sama dgn seluruh langkah
 * lanjutan (create entity + rebind) — lihat pemanggil di Fase 5.
 */
async function lockStagingPengisianBinding(buktiDukungId, pengisianId, tenantId, transaction) {
  const stagingLink = await db.ProsnBuktiIndikator.findOne({
    where: { bukti_dukung_id: buktiDukungId, entity_type: 'PENGISIAN', pengisian_id: pengisianId, tenant_id: tenantId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!stagingLink) throw new ProsnError('Bukti belum melalui tahap staging (unggah awal) untuk pengisian ini.', 404, 'PROSNP_EVIDENCE_NOT_STAGED');
  return stagingLink;
}

/**
 * §7 Phase E — `rebindBuktiKeEntity`. Additive (tidak menghapus binding
 * PENGISIAN staging asal), idempotent (langkah 5), dengan guard anti-leakage
 * lintas-pengisian (langkah 4, kode `PROSNP_EVIDENCE_CROSS_PENGISIAN` — sama
 * persis nama yang sudah dipakai `assertEntityBinding` existing).
 */
async function rebindBuktiKeEntity(buktiDukungId, entityType, entityId, kategori, actor, tenantId, transactionExisting) {
  const run = async (transaction) => {
    // Langkah 1
    const bukti = await db.ProsnBuktiDukung.findOne({ where: { id: buktiDukungId, tenant_id: tenantId }, transaction });
    if (!bukti) throw new ProsnError('Bukti tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');

    if (!Object.prototype.hasOwnProperty.call(ENTITY_MODEL_BY_TYPE, entityType)) {
      throw new ProsnError(`entity_type ${entityType} tidak dikenali untuk rebind.`, 400, 'PROSNP_EVIDENCE_ENTITY_TYPE_INVALID');
    }
    const kategoriValid = KATEGORI_VALID_BY_ENTITY_TYPE[entityType] || [];
    if (!kategori || !kategoriValid.includes(kategori)) {
      throw new ProsnError(`kategori wajib salah satu dari: ${kategoriValid.join(', ')}.`, 400, 'PROSNP_EVIDENCE_KATEGORI_INVALID');
    }

    // Langkah 2 — link_asal WAJIB ADA (bukti berasal dari staging PENGISIAN yang sah)
    const linkAsal = await db.ProsnBuktiIndikator.findOne({ where: { bukti_dukung_id: buktiDukungId, entity_type: 'PENGISIAN', tenant_id: tenantId }, transaction });
    if (!linkAsal) throw new ProsnError('Bukti belum melalui tahap staging (unggah awal) sebelum dapat diikat ke record.', 404, 'PROSNP_EVIDENCE_NOT_STAGED');

    // Langkah 3
    let entity;
    if (entityType === 'CADANGAN_TARGET') {
      entity = await db.ProsnCadanganTarget.findOne({ where: { id: entityId, tenant_id: tenantId }, transaction });
      if (!entity) throw new ProsnError('Target Cadangan Pangan tidak ditemukan.', 404, 'PROSNP_EVIDENCE_ENTITY_NOT_FOUND');
      // CADANGAN_TARGET bersifat tenant+tahun-scoped (dipakai lintas periode), tidak
      // punya pengisian_id — guard langkah 4 (cross-pengisian) tidak berlaku secara
      // struktural, konsisten dgn pengecualian yang sama di `assertEntityBinding` existing.
    } else {
      const modelName = ENTITY_MODEL_BY_TYPE[entityType];
      entity = await db[modelName].findOne({ where: { id: entityId, tenant_id: tenantId }, transaction });
      if (!entity) throw new ProsnError(`Record ${entityType} tidak ditemukan.`, 404, 'PROSNP_EVIDENCE_ENTITY_NOT_FOUND');
      // Langkah 4 — GUARD ANTI-LEAKAGE (P0)
      if (Number(entity.pengisian_id) !== Number(linkAsal.pengisian_id)) {
        throw new ProsnError(`Bukti tidak boleh diikat ke ${entityType} milik pengisian lain.`, 409, 'PROSNP_EVIDENCE_CROSS_PENGISIAN');
      }
    }

    // Langkah 5 — IDEMPOTENCY
    const existing = await db.ProsnBuktiIndikator.findOne({ where: { bukti_dukung_id: buktiDukungId, entity_type: entityType, entity_id: entityId, tenant_id: tenantId }, transaction });
    if (existing) return { link: existing, created: false };

    if (bukti.kategori !== kategori) await bukti.update({ kategori }, { transaction });
    const link = await db.ProsnBuktiIndikator.create({
      tenant_id: tenantId, bukti_dukung_id: buktiDukungId, indikator_id: linkAsal.indikator_id, pengisian_id: linkAsal.pengisian_id,
      entity_type: entityType, entity_id: entityId, relevansi: null, ditautkan_oleh: actor.id,
    }, { transaction });
    return { link, created: true };
  };
  return transactionExisting ? run(transactionExisting) : db.sequelize.transaction(run);
}

module.exports = { ENTITY_MODEL_BY_TYPE, KATEGORI_VALID_BY_ENTITY_TYPE, lockStagingPengisianBinding, rebindBuktiKeEntity };
