'use strict';

const db = require('../../models');
const { ProsnError } = require('./prosnpWorkflowService');
const dpaSource = require('./prosnpDpaSourceService');
const rkaSource = require('./prosnpRkaSourceService');

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
 *
 * Corrective "B.1.3 DPA/DPPA Authoritative Target Source" — cabang BARU
 * `payload.source_mode === 'DPA_OPERASIONAL'` (opt-in eksplisit, TIDAK
 * mengubah perilaku dropdown existing di atas): target_ton B.1.3 diambil
 * backend-authoritative dari DPA/DPPA aktif Sub Kegiatan EXACT
 * `2.09.03.1.02.0005` (lihat prosnpDpaSourceService.resolveOperationalTargetB13).
 * Backend TIDAK PERNAH mempercayai target_ton/source_dpa_id yg dikirim
 * frontend untuk mode ini — semua diturunkan ulang dari DB (anti-spoof, §10).
 *
 * Corrective "B.1.3 RKA Authoritative Target Fallback" — DPA/DPPA dicoba
 * LEBIH DAHULU; hanya jika hasilnya tidak ditemukan/requires_review (target
 * NULL, satuan ambigu, atau baris DPA/DPPA tidak ada sama sekali), baru
 * dicoba fallback ke RKA aktif+APPROVED Sub Kegiatan yang sama
 * (prosnpRkaSourceService.resolveOperationalTargetB13FromRka). RKA TIDAK
 * PERNAH menimpa target DPA/DPPA yang sudah valid (mandat §1/§7).
 */
async function resolveTargetSource(payload) {
  if (payload.source_not_available) {
    if (!payload.manual_override_alasan) throw new ProsnError('Jika sumber APBD tidak tersedia, alasan override manual wajib diisi.', 409, 'PROSNP_DPA_SOURCE_ALASAN_WAJIB');
    return { source_type: 'manual', manual_override_alasan: payload.manual_override_alasan, source_trace: [{ at: new Date().toISOString(), jenis: 'manual', alasan: payload.manual_override_alasan }] };
  }
  if (payload.source_mode === 'DPA_OPERASIONAL') {
    if (!payload.source_tahun || !payload.source_opd_id) {
      throw new ProsnError('Tahun dan OPD sumber DPA/DPPA operasional wajib dipilih.', 409, 'PROSNP_DPA_OPERASIONAL_PARAM_WAJIB');
    }
    const resolusiDpa = await dpaSource.resolveOperationalTargetB13(payload.source_tahun, payload.source_opd_id);
    if (resolusiDpa.ditemukan && !resolusiDpa.requires_review) {
      return {
        source_type: 'sistem',
        source_tahun: resolusiDpa.source_tahun,
        source_opd_id: resolusiDpa.source_opd_id,
        source_sub_kegiatan_id: resolusiDpa.source_sub_kegiatan_id,
        source_dpa_id: resolusiDpa.source_dpa_id,
        source_pagu_dpa: resolusiDpa.source_pagu_dpa,
        source_realisasi: resolusiDpa.source_realisasi,
        source_snapshot_at: new Date(),
        manual_override_alasan: null,
        source_trace: [{
          at: new Date().toISOString(), jenis: 'sistem_dpa_operasional',
          kode_sub_kegiatan: resolusiDpa.kode_sub_kegiatan, nama_sub_kegiatan: resolusiDpa.nama_sub_kegiatan,
          indikator_raw: resolusiDpa.indikator_raw, target_value_raw: resolusiDpa.target_value_raw, target_unit_raw: resolusiDpa.target_unit_raw,
          target_ton_resolved: resolusiDpa.target_ton, versi: resolusiDpa.version, is_active_version: resolusiDpa.is_active_version,
          jenis_dokumen: resolusiDpa.jenis_dokumen, parsing_status: resolusiDpa.parsing_status,
        }],
        resolved_target_ton: resolusiDpa.target_ton,
      };
    }
    // DPA/DPPA tidak tersedia/tidak valid -> coba fallback RKA aktif+APPROVED (mandat RKA fallback).
    const resolusiRka = await rkaSource.resolveOperationalTargetB13FromRka(payload.source_tahun, payload.source_opd_id);
    if (resolusiRka.ditemukan && !resolusiRka.requires_review) {
      return {
        source_type: 'sistem',
        source_tahun: resolusiRka.source_tahun,
        source_opd_id: resolusiRka.source_opd_id,
        source_dpa_id: null, // TIDAK memfabrikasi relasi DPA — sumber ini murni RKA (mandat §9)
        source_snapshot_at: new Date(),
        manual_override_alasan: null,
        source_trace: [{
          at: new Date().toISOString(), jenis: 'sistem_rka_operasional',
          rka_id: resolusiRka.source_rka_id, tahun: resolusiRka.source_tahun, opd_id: resolusiRka.source_opd_id,
          kode_sub_kegiatan: resolusiRka.kode_sub_kegiatan, nama_sub_kegiatan: resolusiRka.nama_sub_kegiatan,
          keluaran_raw: resolusiRka.keluaran_raw, target_value_raw: resolusiRka.target_value_raw, target_unit_raw: resolusiRka.target_unit_raw,
          target_ton_resolved: resolusiRka.target_ton, tahapan: resolusiRka.tahapan, version: resolusiRka.version,
          is_active_version: resolusiRka.is_active_version, approval_status: resolusiRka.approval_status,
          fallback_reason: resolusiDpa.alasan, parsing_status: resolusiRka.parsing_status,
        }],
        resolved_target_ton: resolusiRka.target_ton,
      };
    }
    throw new ProsnError(
      `DPA/DPPA: ${resolusiDpa.alasan || 'tidak tersedia/tidak valid'} — RKA fallback: ${resolusiRka.alasan || 'tidak tersedia/tidak valid'}`,
      409,
      'PROSNP_DPA_RKA_OPERASIONAL_TIDAK_VALID',
    );
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

function validateTargetPayloadDasar(payload) {
  if (!payload.tahun_target) throw new ProsnError('Tahun target wajib diisi.');
}

/**
 * Source-aware (corrective "B.1.3 DPA/DPPA Authoritative Target Source",
 * §10 mandat): target berbasis Keputusan Gubernur tetap mewajibkan
 * nomor+tanggal keputusan (semantik existing, TIDAK berubah). Target
 * berbasis DPA/DPPA operasional (source.resolved_target_ton tersedia —
 * hanya muncul dari resolveTargetSource mode DPA_OPERASIONAL yang sudah
 * memverifikasi provenance ke DB) TIDAK mewajibkan keduanya, dan target_ton
 * SELALU diambil dari hasil resolusi backend (bukan payload klien — anti-spoof).
 */
function validateTargetSourceConsistency(payload, source) {
  const dariDpaOperasional = Boolean(source) && Object.prototype.hasOwnProperty.call(source, 'resolved_target_ton');
  if (!dariDpaOperasional) {
    if (!payload.nomor_keputusan) throw new ProsnError('Nomor Keputusan Kepala Daerah wajib diisi.');
    if (!payload.tanggal_keputusan) throw new ProsnError('Tanggal Keputusan wajib diisi.');
  }
  const targetTon = Number(dariDpaOperasional ? source.resolved_target_ton : payload.target_ton);
  if (!Number.isFinite(targetTon) || targetTon <= 0) throw new ProsnError('Target cadangan pangan beras (ton) wajib diisi dan lebih dari nol — target nol ditolak sesuai mandat.');
  return targetTon;
}

async function createTargetCore(payload, actor, tenantId, source, transaction) {
  if (payload.status_aktif !== false) {
    await db.ProsnCadanganTarget.update({ status_aktif: false }, { where: { tenant_id: tenantId, tahun_target: String(payload.tahun_target), status_aktif: true }, transaction });
  }
  return db.ProsnCadanganTarget.create({
    tenant_id: tenantId, tahun_target: String(payload.tahun_target), nomor_keputusan: payload.nomor_keputusan || null,
    tanggal_keputusan: payload.tanggal_keputusan || null, target_ton: Number(payload.target_ton), satuan: payload.satuan || 'Ton',
    tanggal_mulai_berlaku: payload.tanggal_mulai_berlaku || null, status_aktif: payload.status_aktif !== false,
    catatan: payload.catatan || null, ...source, created_by: actor.id, updated_by: actor.id,
  }, { transaction });
}

/** P1 Atomic Transaction Boundary — lihat catatan sama di prosnpSuratPenugasanService.js. */
async function createTarget(payload, actor, tenantId, options = {}) {
  validateTargetPayloadDasar(payload);
  const source = await resolveTargetSource(payload);
  const targetTonFinal = validateTargetSourceConsistency(payload, source);
  const { resolved_target_ton: _resolvedTargetTon, ...sourceUntukDb } = source;
  const payloadEfektif = { ...payload, target_ton: targetTonFinal };
  if (options.transaction) return createTargetCore(payloadEfektif, actor, tenantId, sourceUntukDb, options.transaction);
  return db.sequelize.transaction((transaction) => createTargetCore(payloadEfektif, actor, tenantId, sourceUntukDb, transaction));
}

async function updateTarget(id, payload, actor, tenantId) {
  validateTargetPayloadDasar(payload);
  const expectedVersion = assertLockVersion(payload.lock_version);
  const shouldResolveSource = payload.source_not_available || payload.source_mode === 'DPA_OPERASIONAL'
    || (payload.source_tahun && payload.source_opd_id && payload.source_kode_sub_kegiatan);
  const source = shouldResolveSource ? await resolveTargetSource(payload) : {};
  const targetTonFinal = validateTargetSourceConsistency(payload, source);
  const { resolved_target_ton: _resolvedTargetTon, ...sourceUntukDb } = source;
  return db.sequelize.transaction(async (transaction) => {
    const target = await db.ProsnCadanganTarget.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!target) throw new ProsnError('Target tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (target.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain.', 409, 'PROSNP_VERSION_CONFLICT');
    if (payload.status_aktif !== false) {
      await db.ProsnCadanganTarget.update({ status_aktif: false }, { where: { tenant_id: tenantId, tahun_target: String(payload.tahun_target), status_aktif: true, id: { [db.Sequelize.Op.ne]: id } }, transaction });
    }
    const [count] = await db.ProsnCadanganTarget.update({
      tahun_target: String(payload.tahun_target), nomor_keputusan: payload.nomor_keputusan || null, tanggal_keputusan: payload.tanggal_keputusan || null,
      target_ton: targetTonFinal, satuan: payload.satuan || 'Ton', tanggal_mulai_berlaku: payload.tanggal_mulai_berlaku || null,
      status_aktif: payload.status_aktif !== false, catatan: payload.catatan || null, ...sourceUntukDb, updated_by: actor.id, lock_version: expectedVersion + 1,
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
