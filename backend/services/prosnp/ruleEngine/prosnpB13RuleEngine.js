'use strict';

/**
 * Rule engine B.1.3 — Target dan Neraca Cadangan Pangan Beras.
 * Bagian paling kritis (mandat §9): backend-authoritative penuh, TIDAK
 * mempercayai saldo yang dihitung frontend.
 *
 * Larangan keras (§9.6) ditegakkan di layer QUERY (bukan cuma di sini):
 * hanya baris stok_transaksi dengan ownership='pemerintah_provinsi' DAN
 * status_verifikasi='valid' DAN komoditas.flag_beras=true yang boleh masuk
 * ke fungsi ini — pemanggil (service) WAJIB memfilter sebelum memanggil
 * hitungNeraca()/hitungB13(), fungsi ini sendiri tidak melakukan query DB
 * (murni kalkulasi, gampang diuji unit).
 *
 * Formula neraca:
 *   saldo_akhir = saldo_awal + pengadaan + penerimaan_lain_sah + koreksi_masuk
 *                 - penyaluran - susut_rusak - koreksi_keluar
 * Formula capaian:
 *   capaian_persen = saldo_akhir_terverifikasi / target_ton * 100
 *
 * Skor: >=100% => 2.50 | 90-99% => 1.25 | 50-89% => 0.25 | <50% => 0.00
 *
 * Corrective Pass "B.1.3 Regulatory Conformance" (Final Regulatory Scoring
 * Decision, disahkan Project Owner 10 Agustus 2026) — redaksi Kepmendagri
 * eksplisit menyatakan B.1.3 dinilai "dalam 1 (satu) tahun" (indikator
 * TAHUNAN), sedangkan e-PeLARA menghitung & menampilkan skor tiap semester.
 * Formula/tier TIDAK berubah (sudah match persis) — yang ditambahkan HANYA
 * metadata semantik `jenis_penilaian`/`keterangan_periode` di `detail` agar
 * skor Semester I secara eksplisit ditandai sbg PROGRESS CHECKPOINT (bukan
 * skor final regulasi tahunan), sedangkan Semester II/akhir tahun ditandai
 * sbg ANNUAL REGULATORY FINAL. Target tahunan, carry-forward, dan aritmetika
 * capaian TIDAK diubah sama sekali — murni penandaan presentasi.
 */

const JENIS_TAMBAH = new Set(['saldo_awal', 'pengadaan', 'penerimaan_lain_sah', 'koreksi_masuk']);
const JENIS_KURANG = new Set(['penyaluran', 'susut_rusak', 'koreksi_keluar']);

/** Klasifikasi presentasi periode — tidak memengaruhi angka/tier, murni label. */
function klasifikasiPeriode(semester) {
  const s = semester === undefined || semester === null ? null : String(semester).trim();
  if (s === '1') {
    return {
      jenis_penilaian: 'progress_checkpoint_semester_1',
      keterangan_periode: 'Progres Indikatif B.1.3 s.d. Semester I — BUKAN skor final regulasi tahunan (indikator dinilai "dalam 1 tahun" per Kepmendagri).',
    };
  }
  if (s === '2') {
    return {
      jenis_penilaian: 'annual_regulatory_final',
      keterangan_periode: 'Skor Regulasi Tahunan B.1.3 (Semester II/akhir tahun) — capaian kumulatif tahun berjalan terhadap target tahunan.',
    };
  }
  return { jenis_penilaian: null, keterangan_periode: null };
}

/**
 * @param {Array} transaksiTerverifikasi - HANYA baris yg sudah difilter ownership=pemerintah_provinsi,
 *   status_verifikasi=valid, komoditas beras (pemanggil bertanggung jawab memfilter ini).
 */
function hitungNeraca(transaksiTerverifikasi) {
  const perJenis = {
    saldo_awal: 0, pengadaan: 0, penerimaan_lain_sah: 0, koreksi_masuk: 0,
    penyaluran: 0, susut_rusak: 0, koreksi_keluar: 0,
  };
  for (const trx of transaksiTerverifikasi) {
    const volume = Number(trx.volume) || 0;
    if (Object.prototype.hasOwnProperty.call(perJenis, trx.jenis_transaksi)) {
      perJenis[trx.jenis_transaksi] += volume;
    }
  }
  let saldoAkhir = 0;
  for (const jenis of JENIS_TAMBAH) saldoAkhir += perJenis[jenis];
  for (const jenis of JENIS_KURANG) saldoAkhir -= perJenis[jenis];
  return { per_jenis: perJenis, saldo_akhir: Math.round(saldoAkhir * 100) / 100 };
}

/**
 * @param {Array} transaksiTerverifikasi - lolos filter ownership/status_verifikasi/komoditas DAN evidence gate (§6.3)
 * @param {{target_ton: number, nomor_keputusan: string, tanggal_keputusan: string} | null} target
 * @param {string|Date} tanggalCutoff
 * @param {boolean} targetEvidenceValid - apakah KEPUTUSAN_KDH bukti valid terikat ke target ini (mandat §6.3)
 * @param {Array} excluded - transaksi yg DIKELUARKAN dari perhitungan + excluded_reason (mandat §6.5), utk transparansi
 * @param {{status:string, selisih:number|null, alasan:string|null}|null} rekonsiliasi - hasil cek saldo antarsemester (mandat §9.2)
 * @param {string|number|null} semester - '1'/'2' utk label presentasi progress-checkpoint vs annual-final (lihat `klasifikasiPeriode`); TIDAK memengaruhi angka/tier
 */
function hitungB13(transaksiTerverifikasi, target, tanggalCutoff, targetEvidenceValid = true, excluded = [], rekonsiliasi = null, semester = null) {
  const neraca = hitungNeraca(transaksiTerverifikasi);
  const detailTambahan = { transaksi_dikecualikan: excluded, rekonsiliasi, ...klasifikasiPeriode(semester) };

  if (!target || !target.target_ton || Number(target.target_ton) <= 0) {
    return {
      skor: 0,
      alasan: 'Target Cadangan Pangan Beras dari Keputusan Kepala Daerah belum tersedia/aktif untuk tahun ini — capaian tidak dapat dihitung.',
      detail: { ...neraca, target_ton: null, capaian_persen: null, tanggal_cutoff: tanggalCutoff, ...detailTambahan },
    };
  }
  if (!targetEvidenceValid) {
    return {
      skor: 0,
      alasan: 'Keputusan Kepala Daerah untuk target ini belum memiliki dokumen KEPUTUSAN_KDH berstatus Valid — capaian tidak dapat dihitung sebelum bukti diverifikasi.',
      detail: { ...neraca, target_ton: Number(target.target_ton), capaian_persen: null, tanggal_cutoff: tanggalCutoff, ...detailTambahan },
    };
  }

  const targetTon = Number(target.target_ton);
  const capaianPersen = Math.round((neraca.saldo_akhir / targetTon) * 100 * 100) / 100;

  let skor;
  let alasan;
  if (capaianPersen >= 100) {
    skor = 2.50;
    alasan = `Capaian ${capaianPersen}% (saldo akhir terverifikasi ${neraca.saldo_akhir} Ton / target ${targetTon} Ton) >= 100%.`;
  } else if (capaianPersen >= 90) {
    skor = 1.25;
    alasan = `Capaian ${capaianPersen}% berada pada rentang 90%-99%.`;
  } else if (capaianPersen >= 50) {
    skor = 0.25;
    alasan = `Capaian ${capaianPersen}% berada pada rentang 50%-89%.`;
  } else {
    skor = 0.00;
    alasan = `Capaian ${capaianPersen}% di bawah 50%.`;
  }
  const { keterangan_periode: keteranganPeriode } = klasifikasiPeriode(semester);
  if (keteranganPeriode) alasan = `${alasan} [${keteranganPeriode}]`;

  return {
    skor,
    alasan,
    detail: {
      ...neraca,
      target_ton: targetTon,
      nomor_keputusan_kdh: target.nomor_keputusan,
      tanggal_keputusan_kdh: target.tanggal_keputusan,
      capaian_persen: capaianPersen,
      tanggal_cutoff: tanggalCutoff,
      ...detailTambahan,
    },
  };
}

module.exports = { hitungNeraca, hitungB13, klasifikasiPeriode };
