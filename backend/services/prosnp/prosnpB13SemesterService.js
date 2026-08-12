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
 *
 * Corrective "B.1.3 Carry-Forward Synchronization" (mandat §2/§3) — carry-
 * forward adalah REKAM SISTEM TURUNAN (derived), BUKAN fakta bisnis mandiri
 * yg boleh membeku begitu dibuat. Invarian arsitektur: saldo pembuka
 * Semester II = saldo akhir Semester I YANG AUTHORITATIVE SAAT INI. Karena
 * itu, bila baris carry-forward sudah ada TAPI nilainya tidak lagi cocok dgn
 * saldo akhir Semester I terkini (mis. Semester I diverifikasi/dikoreksi
 * setelah carry-forward dibuat), baris YANG SAMA di-UPDATE IN PLACE (bukan
 * dibuat baris baru, bukan dihapus-buat-ulang) — identitas record (is_carry_
 * forward=true, status_verifikasi=valid, ownership, komoditas, relasi
 * periode/pengisian) tetap dipertahankan, HANYA volume+sumber_data disegarkan
 * ke nilai live. Pola create-if-missing (baris `!existing`) TETAP menjamin
 * idempotency pembuatan (tidak pernah lebih dari satu baris carry-forward per
 * pengisian) — yg berubah HANYA cabang "sudah ada tapi stale".
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
  const sumberData = `Carry-forward otomatis dari saldo akhir Semester I ${periode.tahun} (periode #${periodeSemester1.id}).`;

  const existing = await db.ProsnStokTransaksi.findOne({
    where: { tenant_id: tenantId, pengisian_id: pengisian.id, is_carry_forward: true },
    transaction,
  });

  if (!existing) {
    const komoditasBeras = await db.ProsnKomoditas.findOne({ where: { kode: 'BERAS' }, transaction });
    await db.ProsnStokTransaksi.create({
      tenant_id: tenantId, periode_id: periode.id, indikator_id: pengisian.indikator_id, pengisian_id: pengisian.id,
      komoditas_id: komoditasBeras.id, tanggal: periode.tanggal_mulai, jenis_transaksi: 'saldo_awal',
      volume: saldoAkhirSemester1, satuan: 'Ton', ownership: 'pemerintah_provinsi', status_verifikasi: 'valid',
      is_carry_forward: true, sumber_data: sumberData,
      created_by: actorId, updated_by: actorId,
    }, { transaction });
    return { dibuat: true, disinkronkan: false, nilai: saldoAkhirSemester1, cocok: true, selisih: 0 };
  }

  const nilaiTersimpanSebelum = Number(existing.volume);
  const selisihSebelumSinkron = Math.round((nilaiTersimpanSebelum - saldoAkhirSemester1) * 100) / 100;
  if (selisihSebelumSinkron === 0) {
    return { dibuat: false, disinkronkan: false, nilai_tersimpan: nilaiTersimpanSebelum, nilai_semester1_terkini: saldoAkhirSemester1, cocok: true, selisih: 0 };
  }

  // Stale -> sinkronkan baris YANG SAMA di tempat (bukan baris baru).
  await existing.update({ volume: saldoAkhirSemester1, sumber_data: sumberData, updated_by: actorId }, { transaction });
  return {
    dibuat: false, disinkronkan: true,
    nilai_tersimpan_sebelum: nilaiTersimpanSebelum, nilai_tersimpan_sesudah: saldoAkhirSemester1,
    nilai_semester1_terkini: saldoAkhirSemester1, cocok: true, selisih: 0, selisih_sebelum_sinkron: selisihSebelumSinkron,
  };
}

/**
 * Cek rekonsiliasi + PICU SINKRONISASI OTOMATIS (mandat corrective §2/§5) —
 * `pastikanCarryForward` sekarang self-heal: bila carry-forward stale, baris
 * disinkronkan IN PLACE sebelum fungsi ini kembali, sehingga `hasil.cocok`
 * SELALU true setelah pemanggilan ini selesai (baik krn memang sudah sinkron
 * sejak awal, ATAU krn baru saja disinkronkan). Metadata rekonsiliasi HARUS
 * jujur menggambarkan KEADAAN SETELAH sinkronisasi (mandat §5) — bukan status
 * "perlu_rekonsiliasi" yg beku pasca-perbaikan otomatis berhasil. Informasi
 * selisih SEBELUM sinkron (bila ada) tetap dikembalikan (bukan disimpan ke
 * kolom baru) utk transparansi pemanggil/API, tanpa menambah skema.
 */
async function jalankanRekonsiliasi(pengisian, tenantId, actorId, transaction) {
  const hasil = await pastikanCarryForward(pengisian, tenantId, actorId, transaction);
  if (!hasil) {
    await pengisian.update({ rekonsiliasi_status: 'tidak_berlaku', rekonsiliasi_selisih: null }, { transaction });
    return { status: 'tidak_berlaku' };
  }
  await pengisian.update({ rekonsiliasi_status: 'ok', rekonsiliasi_selisih: 0, rekonsiliasi_diperiksa_at: new Date() }, { transaction });
  return {
    status: 'ok', selisih: 0,
    disinkronkan: Boolean(hasil.disinkronkan),
    selisih_sebelum_sinkron: hasil.disinkronkan ? hasil.selisih_sebelum_sinkron : 0,
  };
}

/**
 * Corrective "B.1.3 Saldo vs Realisasi" (mandat §9/§10/§14) — realisasi
 * penyaluran KUMULATIF TAHUNAN, terpisah konseptual dari saldo (posisi
 * stok). HANYA menjumlah transaksi berjenis 'penyaluran' yg eligible —
 * carry-forward/saldo_awal TIDAK PERNAH ikut terhitung sbg realisasi (ia
 * berjenis 'saldo_awal', otomatis dikecualikan oleh bucket per_jenis di
 * `hitungNeraca`, bukan filter tambahan yg rawan lupa).
 * Semester I: realisasi = penyaluran Semester I sendiri (`perJenisSendiri`,
 * sudah tersedia dari neraca yg baru dihitung `hitungUlangB13` — TIDAK query
 * ulang).
 * Semester II/tahunan: realisasi = penyaluran Semester I (query independen
 * thd TABEL TRANSAKSI FISIKNYA, bukan lewat representasi carry-forward yg
 * derivatif — mencegah double count) + penyaluran Semester II sendiri.
 */
async function hitungRealisasiTahunan(tenantId, periode, perJenisSendiri, transaction) {
  if (String(periode.semester) !== '2') return perJenisSendiri.penyaluran;

  const periodeSemester1 = await db.ProsnPeriode.findOne({
    where: { tenant_id: tenantId, tahun: periode.tahun, semester: '1', perangkat_daerah_id: periode.perangkat_daerah_id },
    transaction,
  });
  if (!periodeSemester1) return perJenisSendiri.penyaluran;

  const cutoffSemester1 = resolveCutoff(periodeSemester1);
  const { included: includedSemester1 } = await transaksiTerverifikasiUntukPeriode(periodeSemester1.id, tenantId, cutoffSemester1, transaction);
  const { per_jenis: perJenisSemester1 } = hitungNeraca(includedSemester1);
  return Math.round((perJenisSemester1.penyaluran + perJenisSendiri.penyaluran) * 100) / 100;
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

module.exports = { pastikanCarryForward, jalankanRekonsiliasi, setAlasanRekonsiliasi, getNeracaTahunan, transaksiTerverifikasiUntukPeriode, resolveCutoff, hitungRealisasiTahunan };
