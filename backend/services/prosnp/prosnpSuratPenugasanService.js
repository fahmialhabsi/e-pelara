'use strict';

const db = require('../../models');
const { ProsnError } = require('./prosnpWorkflowService');

function assertLockVersion(value) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new ProsnError('lock_version wajib dikirim dari data terakhir.');
  return result;
}

async function assertPengisianEditable(pengisianId, tenantId, transaction) {
  const pengisian = await db.ProsnPengisian.findOne({
    where: { id: pengisianId, tenant_id: tenantId },
    include: [{ model: db.ProsnIndikator, as: 'indikator', include: [{ model: db.ProsnPeriode, as: 'periode' }] }],
    transaction,
  });
  if (!pengisian) throw new ProsnError('Pengisian tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
  if (pengisian.indikator.tipe_form !== 'penugasan_kdh') throw new ProsnError('Indikator ini bukan bertipe Penugasan KDH.', 409, 'PROSNP_TIPE_MISMATCH');
  if (!['belum_diisi', 'dalam_pengisian'].includes(pengisian.status)) throw new ProsnError('Register hanya dapat diubah saat pengisian Belum Diisi/Dalam Pengisian.', 409, 'PROSNP_EDIT_LOCKED');
  if (pengisian.indikator.periode.status !== 'aktif') throw new ProsnError('Periode tidak aktif.', 409, 'PROSNP_PERIOD_LOCKED');
  return pengisian;
}

/**
 * Corrective Pass "B.1.1 Required ringkasan_isi + Validation-Aware Autofill"
 * — daftar field wajib dijadikan DEKLARATIF & DIEKSPOR (`getRequiredFieldsMeta`)
 * sbg SATU sumber kebenaran, dipakai baik oleh `validatePayload` (di sini,
 * PERILAKU/PESAN TIDAK BERUBAH) maupun oleh lapisan autofill (preview
 * analisis) supaya UI tahu field mana yang wajib SEBELUM mengirim apply —
 * menghindari duplikasi aturan independen di banyak tempat (mandat §5).
 */
const REQUIRED_FIELDS = [
  { key: 'nomor_surat', message: 'Nomor surat wajib diisi.' },
  { key: 'tanggal_surat', message: 'Tanggal surat wajib diisi.' },
  { key: 'pejabat_penandatangan', message: 'Pejabat penandatangan wajib diisi.' },
  { key: 'ringkasan_isi', message: 'Ringkasan isi penugasan wajib diisi.' },
];
const CAKUPAN_ANY_OF = ['cakupan_pengadaan', 'cakupan_pengelolaan', 'cakupan_penyaluran'];
const CAKUPAN_GROUP_MESSAGE = 'Minimal satu cakupan tugas (pengadaan/pengelolaan/penyaluran) harus dipilih.';

function validatePayload(payload) {
  REQUIRED_FIELDS.forEach(({ key, message }) => { if (!payload[key]) throw new ProsnError(message); });
  if (!CAKUPAN_ANY_OF.some((key) => payload[key])) throw new ProsnError(CAKUPAN_GROUP_MESSAGE);
}

/** Metadata deklaratif required-fields B.1.1 — dikonsumsi lapisan autofill (read-only, TIDAK mengubah semantik validasi di atas). */
function getRequiredFieldsMeta() {
  return {
    requiredFields: REQUIRED_FIELDS.map((f) => f.key),
    cakupanGroup: { anyOf: [...CAKUPAN_ANY_OF], message: CAKUPAN_GROUP_MESSAGE },
  };
}

async function listByPengisian(pengisianId, tenantId) {
  return db.ProsnSuratPenugasan.findAll({
    where: { pengisian_id: pengisianId, tenant_id: tenantId },
    include: [{ model: db.ProsnSuratPenugasanDukungan, as: 'dukungan' }, { model: db.PerangkatDaerah, as: 'opdPenerima', attributes: ['id', 'nama'] }],
    order: [['tanggal_surat', 'ASC']],
  });
}

async function createCore(pengisianId, payload, actor, tenantId, transaction) {
  const pengisian = await assertPengisianEditable(pengisianId, tenantId, transaction);
  const tanggal = new Date(payload.tanggal_surat);
  const surat = await db.ProsnSuratPenugasan.create({
    tenant_id: tenantId,
    periode_id: pengisian.indikator.periode_id,
    indikator_id: pengisian.indikator_id,
    pengisian_id: pengisian.id,
    nomor_surat: payload.nomor_surat,
    tanggal_surat: payload.tanggal_surat,
    bulan: tanggal.getMonth() + 1,
    jenis_dokumen: payload.jenis_dokumen || null,
    pejabat_penandatangan: payload.pejabat_penandatangan,
    opd_penerima_id: payload.opd_penerima_id || null,
    opd_penerima_nama: payload.opd_penerima_nama || null,
    unit_pelaksana: payload.unit_pelaksana || null,
    tanggal_mulai_berlaku: payload.tanggal_mulai_berlaku || null,
    tanggal_berakhir: payload.tanggal_berakhir || null,
    ringkasan_isi: payload.ringkasan_isi,
    cakupan_pengadaan: Boolean(payload.cakupan_pengadaan),
    cakupan_pengelolaan: Boolean(payload.cakupan_pengelolaan),
    cakupan_penyaluran: Boolean(payload.cakupan_penyaluran),
    status_tindak_lanjut: payload.status_tindak_lanjut || 'belum_ditindaklanjuti',
    catatan: payload.catatan || null,
    created_by: actor.id, updated_by: actor.id,
  }, { transaction });

  const dukungan = Array.isArray(payload.dukungan) ? payload.dukungan : [];
  if (dukungan.length) {
    await db.ProsnSuratPenugasanDukungan.bulkCreate(dukungan.map((d) => ({
      tenant_id: tenantId,
      surat_penugasan_id: surat.id,
      kode_sub_kegiatan: d.kode_sub_kegiatan || null,
      program: d.program || null,
      kegiatan: d.kegiatan || null,
      sub_kegiatan: d.sub_kegiatan || null,
      indikator_output: d.indikator_output || null,
      target: d.target || null,
      pagu: d.pagu ?? null,
      realisasi: d.realisasi ?? null,
      sumber_id: d.sumber_id || null,
      sumber_jenis: d.sumber_jenis || 'manual',
    })), { transaction });
  }

  // Catatan: TIDAK menegakkan count===1 di sini — MySQL mengembalikan affectedRows=0
  // (bukan error) bila nilai baru identik dgn yang tersimpan (mis. dipanggil 2x cepat
  // berturutan dalam detik yg sama, diisi_at membulat ke DATETIME yg sama). Update ini
  // murni efek-samping sinkronisasi status, bukan operasi ber-optimistic-lock.
  await db.ProsnPengisian.update({ status: pengisian.status === 'belum_diisi' ? 'dalam_pengisian' : pengisian.status, diisi_oleh: pengisian.diisi_oleh || actor.id, diisi_at: new Date(), updated_by: actor.id }, { where: { id: pengisian.id }, transaction });

  return db.ProsnSuratPenugasan.findByPk(surat.id, { include: [{ model: db.ProsnSuratPenugasanDukungan, as: 'dukungan' }], transaction });
}

/**
 * P1 Atomic Transaction Boundary (mandat corrective pass) — bila `options.transaction`
 * diberikan (dipanggil dari /autofill-apply, sudah memegang staging-row lock),
 * REUSE transaction tsb, JANGAN buka transaction baru. Bila tidak diberikan
 * (seluruh caller manual existing), perilaku PERSIS SAMA seperti sebelumnya
 * (transaction internal sendiri) — backward compatible, tidak ada jalur logic kedua.
 */
async function create(pengisianId, payload, actor, tenantId, options = {}) {
  validatePayload(payload);
  if (options.transaction) return createCore(pengisianId, payload, actor, tenantId, options.transaction);
  return db.sequelize.transaction((transaction) => createCore(pengisianId, payload, actor, tenantId, transaction));
}

async function update(id, payload, actor, tenantId) {
  validatePayload(payload);
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const surat = await db.ProsnSuratPenugasan.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!surat) throw new ProsnError('Surat penugasan tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    await assertPengisianEditable(surat.pengisian_id, tenantId, transaction);
    if (surat.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    const tanggal = new Date(payload.tanggal_surat);
    const [count] = await db.ProsnSuratPenugasan.update({
      nomor_surat: payload.nomor_surat, tanggal_surat: payload.tanggal_surat, bulan: tanggal.getMonth() + 1,
      jenis_dokumen: payload.jenis_dokumen || null, pejabat_penandatangan: payload.pejabat_penandatangan,
      opd_penerima_id: payload.opd_penerima_id || null, opd_penerima_nama: payload.opd_penerima_nama || null,
      unit_pelaksana: payload.unit_pelaksana || null, tanggal_mulai_berlaku: payload.tanggal_mulai_berlaku || null,
      tanggal_berakhir: payload.tanggal_berakhir || null, ringkasan_isi: payload.ringkasan_isi,
      cakupan_pengadaan: Boolean(payload.cakupan_pengadaan), cakupan_pengelolaan: Boolean(payload.cakupan_pengelolaan),
      cakupan_penyaluran: Boolean(payload.cakupan_penyaluran), status_tindak_lanjut: payload.status_tindak_lanjut || surat.status_tindak_lanjut,
      catatan: payload.catatan || null, updated_by: actor.id, lock_version: expectedVersion + 1,
    }, { where: { id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');

    if (Array.isArray(payload.dukungan)) {
      await db.ProsnSuratPenugasanDukungan.destroy({ where: { surat_penugasan_id: id }, transaction });
      if (payload.dukungan.length) {
        await db.ProsnSuratPenugasanDukungan.bulkCreate(payload.dukungan.map((d) => ({
          tenant_id: tenantId, surat_penugasan_id: id, kode_sub_kegiatan: d.kode_sub_kegiatan || null,
          program: d.program || null, kegiatan: d.kegiatan || null, sub_kegiatan: d.sub_kegiatan || null,
          indikator_output: d.indikator_output || null, target: d.target || null, pagu: d.pagu ?? null,
          realisasi: d.realisasi ?? null, sumber_id: d.sumber_id || null, sumber_jenis: d.sumber_jenis || 'manual',
        })), { transaction });
      }
    }
    return db.ProsnSuratPenugasan.findByPk(id, { include: [{ model: db.ProsnSuratPenugasanDukungan, as: 'dukungan' }], transaction });
  });
}

async function remove(id, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const surat = await db.ProsnSuratPenugasan.findOne({ where: { id, tenant_id: tenantId }, transaction });
    if (!surat) throw new ProsnError('Surat penugasan tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    await assertPengisianEditable(surat.pengisian_id, tenantId, transaction);
    await db.ProsnSuratPenugasanDukungan.destroy({ where: { surat_penugasan_id: id }, transaction });
    const pengisianId = surat.pengisian_id;
    await surat.destroy({ transaction });
    // Nilai balik ditambah (bukan lagi undefined) semata utk auto-recalc skor
    // pasca-hapus (mandat "Automatic Scoring" §20) — tidak ada caller lama yg
    // bergantung pada return value undefined sebelumnya.
    return { pengisian_id: pengisianId };
  });
}

module.exports = { listByPengisian, create, update, remove, getRequiredFieldsMeta };
