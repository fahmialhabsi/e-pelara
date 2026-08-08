'use strict';

const db = require('../../models');
const { ProsnError } = require('./prosnpWorkflowService');
const dpaSource = require('./prosnpDpaSourceService');

const B13_KODE = 'B.1.3';
async function getMasterIndikatorB13Id() {
  const row = await db.ProsnMasterIndikator.findOne({ where: { kode: B13_KODE }, attributes: ['id'] });
  if (!row) throw new ProsnError('Master Indikator B.1.3 tidak ditemukan — data seed ProSN belum lengkap.', 500, 'PROSNP_MASTER_INDIKATOR_MISSING');
  return row.id;
}

/**
 * Resolusi sumber pagu/realisasi DPA (mandat §10). Jika payload menyertakan
 * pilihan dropdown berjenjang (source_tahun/source_opd_id/source_kode_sub_kegiatan),
 * snapshot diambil dari data DPA nyata. Jika tidak tersedia, wajib eksplisit
 * source_not_available=true + manual_override_alasan — TIDAK BOLEH diam-diam
 * kosong (mencegah "pagu manual tanpa jejak sumber").
 */
async function resolveTargetSource(payload) {
  if (payload.source_not_available) {
    if (!payload.manual_override_alasan) throw new ProsnError('Jika sumber APBD tidak tersedia, alasan override manual wajib diisi.', 409, 'PROSNP_DPA_SOURCE_ALASAN_WAJIB');
    return { source_type: 'manual', manual_override_alasan: payload.manual_override_alasan, source_trace: [{ at: new Date().toISOString(), jenis: 'manual', alasan: payload.manual_override_alasan }] };
  }
  if (!payload.source_tahun || !payload.source_opd_id || !payload.source_kode_sub_kegiatan) {
    return { source_type: 'manual', manual_override_alasan: null, source_trace: null };
  }
  const masterIndikatorId = await getMasterIndikatorB13Id();
  const snapshot = await dpaSource.ambilSnapshot(masterIndikatorId, payload.source_tahun, payload.source_opd_id, payload.source_kode_sub_kegiatan);
  return {
    source_type: 'sistem',
    source_tahun: snapshot.source_tahun,
    source_opd_id: snapshot.source_opd_id,
    source_sub_kegiatan_id: snapshot.source_sub_kegiatan_id,
    source_dpa_id: snapshot.source_dpa_id,
    source_pagu_dpa: snapshot.source_pagu_dpa,
    source_realisasi: snapshot.source_realisasi,
    source_snapshot_at: new Date(),
    manual_override_alasan: null,
    source_trace: [{ at: new Date().toISOString(), jenis: 'sistem', ...snapshot.detail, pagu_dpa: snapshot.source_pagu_dpa, realisasi: snapshot.source_realisasi }],
  };
}

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
  if (pengisian.indikator.tipe_form !== 'cadangan_pangan_beras') throw new ProsnError('Indikator ini bukan bertipe Cadangan Pangan Beras.', 409, 'PROSNP_TIPE_MISMATCH');
  if (!['belum_diisi', 'dalam_pengisian'].includes(pengisian.status)) throw new ProsnError('Data hanya dapat diubah saat pengisian Belum Diisi/Dalam Pengisian.', 409, 'PROSNP_EDIT_LOCKED');
  if (pengisian.indikator.periode.status !== 'aktif') throw new ProsnError('Periode tidak aktif.', 409, 'PROSNP_PERIOD_LOCKED');
  return pengisian;
}

// ── Target Keputusan KDH (scope: tenant + tahun, dipakai bersama semua periode tahun tsb) ──
async function listTarget(tenantId, tahun) {
  const where = { tenant_id: tenantId };
  if (tahun) where.tahun_target = String(tahun);
  return db.ProsnCadanganTarget.findAll({ where, order: [['tahun_target', 'DESC'], ['tanggal_keputusan', 'DESC']] });
}

function validateTargetPayload(payload) {
  if (!payload.tahun_target) throw new ProsnError('Tahun target wajib diisi.');
  if (!payload.nomor_keputusan) throw new ProsnError('Nomor Keputusan Kepala Daerah wajib diisi.');
  if (!payload.tanggal_keputusan) throw new ProsnError('Tanggal Keputusan wajib diisi.');
  const target = Number(payload.target_ton);
  if (!Number.isFinite(target) || target <= 0) throw new ProsnError('Target cadangan pangan beras (ton) wajib diisi dan lebih dari nol — target nol ditolak sesuai mandat.');
}

async function createTargetCore(payload, actor, tenantId, source, transaction) {
  if (payload.status_aktif !== false) {
    await db.ProsnCadanganTarget.update({ status_aktif: false }, { where: { tenant_id: tenantId, tahun_target: String(payload.tahun_target), status_aktif: true }, transaction });
  }
  return db.ProsnCadanganTarget.create({
    tenant_id: tenantId, tahun_target: String(payload.tahun_target), nomor_keputusan: payload.nomor_keputusan,
    tanggal_keputusan: payload.tanggal_keputusan, target_ton: Number(payload.target_ton), satuan: payload.satuan || 'Ton',
    tanggal_mulai_berlaku: payload.tanggal_mulai_berlaku || null, status_aktif: payload.status_aktif !== false,
    catatan: payload.catatan || null, ...source, created_by: actor.id, updated_by: actor.id,
  }, { transaction });
}

/** P1 Atomic Transaction Boundary — lihat catatan sama di prosnpSuratPenugasanService.js. */
async function createTarget(payload, actor, tenantId, options = {}) {
  validateTargetPayload(payload);
  const source = await resolveTargetSource(payload);
  if (options.transaction) return createTargetCore(payload, actor, tenantId, source, options.transaction);
  return db.sequelize.transaction((transaction) => createTargetCore(payload, actor, tenantId, source, transaction));
}

async function updateTarget(id, payload, actor, tenantId) {
  validateTargetPayload(payload);
  const expectedVersion = assertLockVersion(payload.lock_version);
  const source = (payload.source_not_available || (payload.source_tahun && payload.source_opd_id && payload.source_kode_sub_kegiatan))
    ? await resolveTargetSource(payload)
    : {};
  return db.sequelize.transaction(async (transaction) => {
    const target = await db.ProsnCadanganTarget.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!target) throw new ProsnError('Target tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (target.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain.', 409, 'PROSNP_VERSION_CONFLICT');
    if (payload.status_aktif !== false) {
      await db.ProsnCadanganTarget.update({ status_aktif: false }, { where: { tenant_id: tenantId, tahun_target: String(payload.tahun_target), status_aktif: true, id: { [db.Sequelize.Op.ne]: id } }, transaction });
    }
    const [count] = await db.ProsnCadanganTarget.update({
      tahun_target: String(payload.tahun_target), nomor_keputusan: payload.nomor_keputusan, tanggal_keputusan: payload.tanggal_keputusan,
      target_ton: Number(payload.target_ton), satuan: payload.satuan || 'Ton', tanggal_mulai_berlaku: payload.tanggal_mulai_berlaku || null,
      status_aktif: payload.status_aktif !== false, catatan: payload.catatan || null, ...source, updated_by: actor.id, lock_version: expectedVersion + 1,
    }, { where: { id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Data telah diubah pengguna lain.', 409, 'PROSNP_VERSION_CONFLICT');
    return db.ProsnCadanganTarget.findByPk(id, { transaction });
  });
}

// "Perbarui Snapshot dari Sumber" (mandat §10) — sumber tidak boleh diam-diam
// mengubah laporan; refresh harus eksplisit & tercatat di source_trace (audit trail).
async function refreshSnapshot(id, actor, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const target = await db.ProsnCadanganTarget.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!target) throw new ProsnError('Target tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (target.source_type !== 'sistem' || !target.source_tahun || !target.source_opd_id || !target.source_sub_kegiatan_id) {
      throw new ProsnError('Target ini bukan bersumber dari sistem (source_type=manual) — tidak ada sumber untuk disegarkan.', 409, 'PROSNP_DPA_SOURCE_NOT_SISTEM');
    }
    const masterIndikatorId = await getMasterIndikatorB13Id();
    const subKegiatan = await db.MasterSubKegiatan.findByPk(target.source_sub_kegiatan_id, { transaction });
    const kodeSubKegiatan = subKegiatan?.kode_sub_kegiatan_full || subKegiatan?.kode_sub_kegiatan;
    const snapshot = await dpaSource.ambilSnapshot(masterIndikatorId, target.source_tahun, target.source_opd_id, kodeSubKegiatan, {});
    const riwayatSebelumnya = Array.isArray(target.source_trace) ? target.source_trace : [];
    const riwayatBaru = [...riwayatSebelumnya, {
      at: new Date().toISOString(), jenis: 'refresh', oleh: actor.id,
      pagu_dpa_sebelumnya: target.source_pagu_dpa !== null ? Number(target.source_pagu_dpa) : null,
      realisasi_sebelumnya: target.source_realisasi !== null ? Number(target.source_realisasi) : null,
      ...snapshot.detail, pagu_dpa: snapshot.source_pagu_dpa, realisasi: snapshot.source_realisasi,
    }];
    await target.update({
      source_dpa_id: snapshot.source_dpa_id, source_pagu_dpa: snapshot.source_pagu_dpa, source_realisasi: snapshot.source_realisasi,
      source_snapshot_at: new Date(), source_trace: riwayatBaru, updated_by: actor.id, lock_version: target.lock_version + 1,
    }, { transaction });
    return target;
  });
}

// ── Transaksi Stok ──
function validateTransaksiPayload(payload) {
  if (!payload.komoditas_id) throw new ProsnError('Komoditas wajib dipilih.');
  if (!payload.tanggal) throw new ProsnError('Tanggal transaksi wajib diisi.');
  if (!payload.jenis_transaksi) throw new ProsnError('Jenis transaksi wajib dipilih.');
  const volume = Number(payload.volume);
  if (!Number.isFinite(volume) || volume < 0) throw new ProsnError('Volume wajib diisi (angka >= 0).');
}

async function listTransaksi(pengisianId, tenantId) {
  return db.ProsnStokTransaksi.findAll({
    where: { pengisian_id: pengisianId, tenant_id: tenantId },
    include: [{ model: db.ProsnKomoditas, as: 'komoditas' }],
    order: [['tanggal', 'ASC']],
  });
}

async function createTransaksi(pengisianId, payload, actor, tenantId) {
  validateTransaksiPayload(payload);
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await assertPengisianEditable(pengisianId, tenantId, transaction);
    const komoditas = await db.ProsnKomoditas.findByPk(payload.komoditas_id, { transaction });
    if (!komoditas) throw new ProsnError('Komoditas tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    // Sengaja TIDAK ditolak bila komoditas bukan Beras atau ownership bukan Pemprov (mandat §9.6:
    // "boleh disimpan sebagai informasi situasional terpisah, tetapi tidak boleh masuk pembilang
    // capaian ProSN") — pengecualian dari perhitungan dilakukan di query rule engine, bukan di sini.
    const trx = await db.ProsnStokTransaksi.create({
      tenant_id: tenantId, periode_id: pengisian.indikator.periode_id, indikator_id: pengisian.indikator_id, pengisian_id: pengisian.id,
      komoditas_id: payload.komoditas_id, tanggal: payload.tanggal, jenis_transaksi: payload.jenis_transaksi, volume: Number(payload.volume),
      satuan: payload.satuan || 'Ton', lokasi_gudang: payload.lokasi_gudang || null, pengelola: payload.pengelola || null,
      nomor_dokumen: payload.nomor_dokumen || null, sumber_data: payload.sumber_data || null, catatan: payload.catatan || null,
      ownership: payload.ownership || 'pemerintah_provinsi', status_verifikasi: payload.status_verifikasi || 'uploaded',
      created_by: actor.id, updated_by: actor.id,
    }, { transaction });
    await db.ProsnPengisian.update({ status: pengisian.status === 'belum_diisi' ? 'dalam_pengisian' : pengisian.status, diisi_oleh: pengisian.diisi_oleh || actor.id, diisi_at: new Date(), updated_by: actor.id }, { where: { id: pengisian.id }, transaction });
    return trx;
  });
}

async function updateTransaksi(id, payload, actor, tenantId) {
  validateTransaksiPayload(payload);
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const trx = await db.ProsnStokTransaksi.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!trx) throw new ProsnError('Transaksi tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    await assertPengisianEditable(trx.pengisian_id, tenantId, transaction);
    if (trx.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain.', 409, 'PROSNP_VERSION_CONFLICT');
    const [count] = await db.ProsnStokTransaksi.update({
      komoditas_id: payload.komoditas_id, tanggal: payload.tanggal, jenis_transaksi: payload.jenis_transaksi, volume: Number(payload.volume),
      satuan: payload.satuan || 'Ton', lokasi_gudang: payload.lokasi_gudang || null, pengelola: payload.pengelola || null,
      nomor_dokumen: payload.nomor_dokumen || null, sumber_data: payload.sumber_data || null, catatan: payload.catatan || null,
      ownership: payload.ownership || trx.ownership, status_verifikasi: payload.status_verifikasi || trx.status_verifikasi,
      updated_by: actor.id, lock_version: expectedVersion + 1,
    }, { where: { id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Data telah diubah pengguna lain.', 409, 'PROSNP_VERSION_CONFLICT');
    return db.ProsnStokTransaksi.findByPk(id, { transaction });
  });
}

async function removeTransaksi(id, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const trx = await db.ProsnStokTransaksi.findOne({ where: { id, tenant_id: tenantId }, transaction });
    if (!trx) throw new ProsnError('Transaksi tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    await assertPengisianEditable(trx.pengisian_id, tenantId, transaction);
    await trx.destroy({ transaction });
  });
}

module.exports = { listTarget, createTarget, updateTarget, refreshSnapshot, listTransaksi, createTransaksi, updateTransaksi, removeTransaksi };
