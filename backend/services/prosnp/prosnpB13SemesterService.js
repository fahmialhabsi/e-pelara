'use strict';

/**
 * Rekonsiliasi Semester B.1.3 (mandat §9) — Pilihan B: transaksi tetap
 * per-pengisian/per-periode, ledger tahunan dicapai lewat QUERY lintas
 * periode (bukan refactor skema total), dengan penanda carry-forward untuk
 * mencegah double counting Semester I di Semester II.
 */

const db = require('../../models');
const { ProsnError } = require('./prosnpWorkflowService');
const { hitungNeraca, resolveDefaultCutoff } = require('./ruleEngine/prosnpB13RuleEngine');
const { transaksiMemilikiBuktiValid } = require('./prosnpEvidenceGateService');

/**
 * Corrective "B.1.3 Period Cutoff Wiring" (mandat §2/§4) — resolusi cutoff
 * SATU tempat, dipakai konsisten di seluruh perhitungan B.1.3 (skor,
 * carry-forward, neraca tahunan): eksplisit `tanggal_cutoff` bila diisi >
 * turunan substantif per tahun+semester ('1'->30 Juni, '2'->31 Desember) >
 * `tanggal_tenggat` HANYA sbg jaring pengaman terakhir (mis. periode
 * `semester='tahunan'` yang tidak punya turunan semester 1/2).
 */
function resolveCutoff(periode) {
  return periode.tanggal_cutoff || resolveDefaultCutoff(periode.tahun, periode.semester) || periode.tanggal_tenggat;
}

async function transaksiTerverifikasiUntukPeriode(periodeId, tenantId, cutoff, transaction) {
  const rows = await db.ProsnStokTransaksi.findAll({
    where: {
      tenant_id: tenantId, periode_id: periodeId, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid',
      tanggal: { [db.Sequelize.Op.lte]: cutoff },
    },
    include: [{ model: db.ProsnKomoditas, as: 'komoditas', where: { flag_beras: true }, attributes: [], required: true }],
    transaction,
  });
  const included = [];
  const excluded = [];
  for (const row of rows) {
    const cek = await transaksiMemilikiBuktiValid(row, tenantId, transaction);
    if (cek.valid) included.push(row.get({ plain: true }));
    else excluded.push({ id: row.id, jenis_transaksi: row.jenis_transaksi, tanggal: row.tanggal, volume: Number(row.volume), excluded_reason: cek.alasan });
  }
  return { included, excluded };
}

/**
 * Pastikan pengisian Semester II punya baris saldo_awal carry-forward dari
 * saldo akhir Semester I (dibuat SEKALI, ditandai is_carry_forward=true).
 * Dipanggil otomatis sebelum hitung ulang skor B.1.3 Semester II.
 */
async function pastikanCarryForward(pengisian, tenantId, actorId, transaction) {
  const periode = pengisian.indikator.periode;
  if (String(periode.semester) !== '2') return null;

  const periodeSemester1 = await db.ProsnPeriode.findOne({
    where: { tenant_id: tenantId, tahun: periode.tahun, semester: '1', perangkat_daerah_id: periode.perangkat_daerah_id },
    transaction,
  });
  if (!periodeSemester1) return null; // tidak ada Semester I -> tidak ada yg di-carry-forward, biarkan mulai dari 0

  const cutoffSemester1 = resolveCutoff(periodeSemester1);
  const { included } = await transaksiTerverifikasiUntukPeriode(periodeSemester1.id, tenantId, cutoffSemester1, transaction);
  const { saldo_akhir: saldoAkhirSemester1 } = hitungNeraca(included);

  const existing = await db.ProsnStokTransaksi.findOne({
    where: { tenant_id: tenantId, pengisian_id: pengisian.id, is_carry_forward: true },
    transaction,
  });
  const komoditasBeras = await db.ProsnKomoditas.findOne({ where: { kode: 'BERAS' }, transaction });

  if (!existing) {
    await db.ProsnStokTransaksi.create({
      tenant_id: tenantId, periode_id: periode.id, indikator_id: pengisian.indikator_id, pengisian_id: pengisian.id,
      komoditas_id: komoditasBeras.id, tanggal: periode.tanggal_mulai, jenis_transaksi: 'saldo_awal',
      volume: saldoAkhirSemester1, satuan: 'Ton', ownership: 'pemerintah_provinsi', status_verifikasi: 'valid',
      is_carry_forward: true, sumber_data: `Carry-forward otomatis dari saldo akhir Semester I ${periode.tahun} (periode #${periodeSemester1.id}).`,
      created_by: actorId, updated_by: actorId,
    }, { transaction });
    return { dibuat: true, nilai: saldoAkhirSemester1, cocok: true, selisih: 0 };
  }

  const selisih = Math.round((Number(existing.volume) - saldoAkhirSemester1) * 100) / 100;
  return { dibuat: false, nilai_tersimpan: Number(existing.volume), nilai_semester1_terkini: saldoAkhirSemester1, cocok: selisih === 0, selisih };
}

/**
 * Cek rekonsiliasi: bila carry-forward yg tersimpan sudah TIDAK cocok lagi
 * dengan saldo akhir Semester I terkini (mis. Semester I dikoreksi setelah
 * carry-forward dibuat), tandai PERLU_REKONSILIASI — tidak menggagalkan,
 * tapi memerlukan alasan + bukti rekonsiliasi valid sebelum status Lengkap
 * (mandat §9.2, ditegakkan di guard assertKelengkapanTipeBaru).
 */
async function jalankanRekonsiliasi(pengisian, tenantId, actorId, transaction) {
  const hasil = await pastikanCarryForward(pengisian, tenantId, actorId, transaction);
  if (!hasil) {
    await pengisian.update({ rekonsiliasi_status: 'tidak_berlaku', rekonsiliasi_selisih: null }, { transaction });
    return { status: 'tidak_berlaku' };
  }
  if (hasil.cocok) {
    await pengisian.update({ rekonsiliasi_status: 'ok', rekonsiliasi_selisih: 0, rekonsiliasi_diperiksa_at: new Date() }, { transaction });
    return { status: 'ok', selisih: 0 };
  }
  await pengisian.update({ rekonsiliasi_status: 'perlu_rekonsiliasi', rekonsiliasi_selisih: hasil.selisih, rekonsiliasi_diperiksa_at: new Date() }, { transaction });
  return { status: 'perlu_rekonsiliasi', selisih: hasil.selisih, detail: hasil };
}

async function setAlasanRekonsiliasi(pengisianId, alasan, actor, tenantId) {
  if (!alasan) throw new ProsnError('Alasan rekonsiliasi wajib diisi.');
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await db.ProsnPengisian.findOne({ where: { id: pengisianId, tenant_id: tenantId }, transaction });
    if (!pengisian) throw new ProsnError('Pengisian tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (pengisian.rekonsiliasi_status !== 'perlu_rekonsiliasi') throw new ProsnError('Pengisian ini tidak sedang memerlukan rekonsiliasi.', 409, 'PROSNP_RECONCILIATION_NOT_REQUIRED');
    await pengisian.update({ rekonsiliasi_alasan: alasan, updated_by: actor.id }, { transaction });
    return pengisian;
  });
}

/** Tampilan neraca tahunan (mandat §9.3): saldo awal tahun -> mutasi Sem I -> saldo 30 Juni -> mutasi Sem II -> saldo 31 Des. */
async function getNeracaTahunan(tenantId, tahun, perangkatDaerahId) {
  const periodeList = await db.ProsnPeriode.findAll({ where: { tenant_id: tenantId, tahun: String(tahun), perangkat_daerah_id: perangkatDaerahId, semester: ['1', '2'] } });
  const semester1 = periodeList.find((p) => String(p.semester) === '1');
  const semester2 = periodeList.find((p) => String(p.semester) === '2');
  const target = await db.ProsnCadanganTarget.findOne({ where: { tenant_id: tenantId, tahun_target: String(tahun), status_aktif: true } });

  const hasilSemester = async (periode) => {
    if (!periode) return null;
    const cutoff = resolveCutoff(periode);
    const { included, excluded } = await transaksiTerverifikasiUntukPeriode(periode.id, tenantId, cutoff, null);
    const neraca = hitungNeraca(included);
    return { periode_id: periode.id, cutoff, ...neraca, transaksi_dikecualikan: excluded, capaian_persen: target ? Math.round((neraca.saldo_akhir / Number(target.target_ton)) * 100 * 100) / 100 : null };
  };

  const sem1 = await hasilSemester(semester1);
  const sem2 = await hasilSemester(semester2);

  return {
    tahun: String(tahun),
    target: target ? { nomor_keputusan: target.nomor_keputusan, target_ton: Number(target.target_ton), tanggal_keputusan: target.tanggal_keputusan } : null,
    saldo_awal_tahun: sem1 ? sem1.per_jenis.saldo_awal : null,
    semester_1: sem1,
    saldo_30_juni: sem1 ? sem1.saldo_akhir : null,
    semester_2: sem2,
    saldo_31_desember: sem2 ? sem2.saldo_akhir : null,
  };
}

module.exports = { pastikanCarryForward, jalankanRekonsiliasi, setAlasanRekonsiliasi, getNeracaTahunan, transaksiTerverifikasiUntukPeriode, resolveCutoff };
