'use strict';

/**
 * Rule engine B.1.1 — Penugasan Kepala Daerah kepada OPD.
 * Corrective pass (mandat §7): diganti dari selisih-hari (<=31/<=62) menjadi
 * evaluasi BULAN KALENDER, evidence-aware (surat tanpa SURAT_PENUGASAN valid
 * yang terikat langsung ke surat itu TIDAK dihitung sah sama sekali).
 *
 * Skor:
 *   2,00 = setiap bulan kalender dalam periode punya >=1 surat sah
 *   1,00 = tidak ada jarak >1 bulan kalender berturut-turut tanpa surat sah
 *          (maksimal 1 bulan kosong beruntun)
 *   0,00 = ada jarak >=2 bulan kalender berturut-turut tanpa surat sah, atau
 *          tidak ada surat sah sama sekali
 * Interpretasi redaksi regulasi didokumentasikan di `interpretasi_skor_internal`
 * (mandat §8 — jangan menyembunyikan penafsiran).
 *
 * Corrective Pass "B.1.1 Semester Evaluation Window" (Kepmendagri
 * 700.1.1.4-180/2026) — cakupan bulan penilaian kinerja SEKARANG diturunkan
 * dari `periode.tahun` + `periode.semester` (Semester I = Jan-Jun, Semester
 * II = Jul-Des), BUKAN lagi dari `periode.tanggal_tenggat`. `tanggal_tenggat`
 * adalah metadata batas waktu PENYAMPAIAN laporan administratif (jadwal
 * regulasi: laporan Semester I disampaikan bulan Juli tahun berjalan — bisa
 * jatuh di bulan SETELAH semester berakhir) dan TIDAK BOLEH memperpanjang
 * cakupan bulan yang dinilai kinerjanya.
 */

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}
function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function monthRange(periodeMulai, periodeAkhir) {
  const keys = [];
  const cursor = new Date(periodeMulai.getFullYear(), periodeMulai.getMonth(), 1);
  const akhir = new Date(periodeAkhir.getFullYear(), periodeAkhir.getMonth(), 1);
  while (cursor <= akhir) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

/** Terima representasi semester yang ada di domain existing saja (1/"1"/2/"2") — TIDAK menebak nilai lain. */
function normalizeSemester(semester) {
  const s = String(semester).trim();
  if (s === '1') return 1;
  if (s === '2') return 2;
  return null;
}

/**
 * Cakupan bulan evaluasi kinerja Semester — canonical, lepas dari
 * `tanggal_tenggat` (lihat komentar header file). Semester I = Januari s.d.
 * Juni tahun berjalan; Semester II = Juli s.d. Desember tahun berjalan.
 * Gagal EKSPLISIT (throw) bila tahun/semester tidak valid — TIDAK PERNAH
 * fallback diam-diam ke `tanggal_tenggat` atau rentang Jan-Des.
 */
function semesterEvaluationWindow(periode) {
  const tahun = Number(periode?.tahun);
  if (!Number.isInteger(tahun) || tahun < 1900) {
    throw new Error(`periode.tahun tidak valid utk evaluasi B.1.1: ${JSON.stringify(periode?.tahun)}`);
  }
  const semester = normalizeSemester(periode?.semester);
  if (semester === null) {
    throw new Error(`periode.semester tidak valid utk evaluasi B.1.1 (harus 1 atau 2): ${JSON.stringify(periode?.semester)}`);
  }
  const startMonth = semester === 1 ? 0 : 6; // 0-indexed: Januari atau Juli
  const start = new Date(tahun, startMonth, 1);
  const end = new Date(tahun, startMonth + 6, 0); // hari terakhir bulan ke-6 semester ini (30 Jun / 31 Des)
  return { start, end, months: monthRange(start, end) };
}

/**
 * @param {Array} suratList - baris prosnp_surat_penugasan (plain object)
 * @param {{tahun, semester}} periode - cakupan bulan evaluasi diturunkan dari
 *   `tahun`+`semester` (lihat `semesterEvaluationWindow`), BUKAN dari
 *   `tanggal_mulai`/`tanggal_tenggat` periode (metadata administratif).
 * @param {(suratId:number) => boolean} adaBuktiValid - cek SURAT_PENUGASAN valid terikat ke surat ini
 */
function hitungB11(suratList, periode, adaBuktiValid) {
  const { start: periodeMulai, end: periodeAkhir, months: semuaBulan } = semesterEvaluationWindow(periode);

  const nomorTerlihat = new Map();
  const duplikat = [];
  const sah = [];
  const ditolak = [];

  for (const surat of suratList) {
    const alasan = [];
    const tanggal = toDate(surat.tanggal_surat);
    if (tanggal < periodeMulai || tanggal > periodeAkhir) alasan.push('Di luar rentang periode');
    if (!(surat.cakupan_pengadaan || surat.cakupan_pengelolaan || surat.cakupan_penyaluran)) {
      alasan.push('Tidak ada cakupan tugas (pengadaan/pengelolaan/penyaluran) yang dipilih');
    }
    const punyaBukti = Boolean(adaBuktiValid && adaBuktiValid(surat.id));
    if (!punyaBukti) alasan.push('Belum ada dokumen SURAT_PENUGASAN berstatus Valid yang terikat langsung ke surat ini');

    const nomorKey = String(surat.nomor_surat || '').trim().toLowerCase();
    if (nomorKey && nomorTerlihat.has(nomorKey)) {
      duplikat.push({ id: surat.id, nomor_surat: surat.nomor_surat, kemungkinan_duplikat_dari: nomorTerlihat.get(nomorKey) });
    } else if (nomorKey) {
      nomorTerlihat.set(nomorKey, surat.id);
    }

    if (alasan.length) ditolak.push({ id: surat.id, nomor_surat: surat.nomor_surat, alasan });
    else sah.push(surat);
  }

  const bulanTerpenuhi = new Set(sah.map((s) => monthKey(toDate(s.tanggal_surat))));
  const bulanKosong = semuaBulan.filter((b) => !bulanTerpenuhi.has(b));

  // Interval bulan kosong TERPANJANG BERUNTUN (bukan cuma daftar bulan kosong) —
  // menentukan skor per mandat §7.1.
  let terpanjangBeruntun = 0;
  let berjalan = 0;
  for (const bulan of semuaBulan) {
    if (bulanTerpenuhi.has(bulan)) { berjalan = 0; }
    else { berjalan += 1; terpanjangBeruntun = Math.max(terpanjangBeruntun, berjalan); }
  }

  let skor;
  let alasanSkor;
  const hasilFaktual = {
    bulan_terpenuhi: [...bulanTerpenuhi].sort(),
    bulan_kosong: bulanKosong,
    interval_bulan_terpanjang: terpanjangBeruntun,
    jumlah_surat_sah: sah.length,
    jumlah_surat_dikeluarkan: suratList.length,
  };

  if (sah.length === 0) {
    skor = 0.00;
    alasanSkor = 'Tidak ada surat penugasan sah (dalam periode, cakupan terisi, dan bukti dokumen valid) pada periode ini.';
  } else if (terpanjangBeruntun === 0) {
    skor = 2.00;
    alasanSkor = 'Setiap bulan kalender dalam periode memiliki minimal satu surat penugasan sah.';
  } else if (terpanjangBeruntun === 1) {
    skor = 1.00;
    alasanSkor = 'Tidak ada jarak lebih dari 1 bulan kalender berturut-turut tanpa surat sah (penugasan tersedia minimal setiap 2 bulan).';
  } else {
    skor = 0.00;
    alasanSkor = `Terdapat jarak ${terpanjangBeruntun} bulan kalender berturut-turut tanpa surat sah (bulan kosong: ${bulanKosong.join(', ')}).`;
  }

  return {
    skor,
    alasan: alasanSkor,
    detail: {
      ...hasilFaktual,
      jumlah_surat_ditolak: ditolak.length,
      jumlah_kemungkinan_duplikat: duplikat.length,
      surat_ditolak: ditolak,
      kemungkinan_duplikat: duplikat,
      interpretasi_skor_internal:
        'Redaksi Kepmendagri dapat ditafsirkan lebih dari satu cara. Interpretasi internal yang dipakai: ' +
        '0 bulan kosong beruntun -> 2,00; maksimal 1 bulan kosong beruntun -> 1,00; >=2 bulan kosong beruntun -> 0,00. ' +
        'Distribusi bulanan faktual ditampilkan apa adanya di atas, terlepas dari interpretasi skor ini.',
    },
  };
}

module.exports = { hitungB11, semesterEvaluationWindow };
