'use strict';

/**
 * Rule engine B.1.2 — Koordinasi dengan Forkopimda.
 * Corrective pass (mandat §6.2/§8): evidence WAJIB per-rapat (bukan lagi satu
 * cek bukti untuk seluruh indikator) — satu undangan/notulen TIDAK BOLEH
 * melegitimasi rapat lain. `adaBuktiLengkap(rapatId)` mengecek UNDANGAN +
 * DAFTAR_HADIR + NOTULEN yang terikat LANGSUNG (entity_type/entity_id) ke
 * rapat tsb (lihat prosnpEvidenceGateService.rapatMemilikiBuktiLengkap).
 *
 * Corrective Pass "B.1.2 Regulatory Conformance" (Final Regulatory Scoring
 * Decision, disahkan Project Owner 10 Agustus 2026) — redaksi Kepmendagri
 * 700.1.1.4-180/2026 TIDAK memuat kata "setiap"/kuantifier universal utk
 * B.1.2 (berbeda dari B.1.1 yang memuatnya), dan tier skor 0 memakai
 * denominator "6 (enam) bulan" (bukan "1 bulan") — mengindikasikan model
 * FREKUENSI RATA-RATA BULANAN SELAMA SATU SEMESTER, bukan gerbang independen
 * per-bulan. Model `.every()` (semua bulan harus memenuhi ambang) yang
 * dipakai SEBELUMNYA terbukti over-strict dan sudah DIHAPUS.
 *
 * Skor (final):
 *   frekuensi_rata_rata_bulanan = jumlah_rapat_sah / jumlah_bulan_evaluasi (6)
 *   >= 2  => 2,00
 *   >= 1 dan < 2 => 1,00
 *   < 1   => 0,00
 * Satu/beberapa bulan kosong TIDAK LAGI otomatis memaksa skor 0 — distribusi
 * bulanan faktual (`hasil_faktual`, `bulan_kosong`) tetap dihasilkan sbg FAKTA
 * transparansi, terpisah dari penentuan skor.
 *
 * Corrective Pass "B.1.2 Semester Evaluation Window" — cakupan bulan
 * penilaian kinerja diturunkan dari `periode.tahun` + `periode.semester`
 * (reuse `semesterEvaluationWindow` dari B.1.1, BUKAN lagi dari
 * `periode.tanggal_mulai`/`tanggal_tenggat`. `tanggal_tenggat` adalah
 * metadata batas waktu PENYAMPAIAN laporan administratif (bisa jatuh di
 * bulan SETELAH semester berakhir) dan TIDAK BOLEH memperpanjang/memotong
 * cakupan bulan yang dinilai kinerjanya — lihat komentar header
 * prosnpB11RuleEngine.js untuk rasional lengkap.
 */
const { semesterEvaluationWindow } = require('./prosnpB11RuleEngine');

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}
function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {Array} rapatList - baris prosnp_rapat_forkopimda
 * @param {{tahun, semester}} periode - cakupan bulan evaluasi diturunkan dari
 *   `tahun`+`semester` (lihat `semesterEvaluationWindow`), BUKAN dari
 *   `tanggal_mulai`/`tanggal_tenggat` periode (metadata administratif).
 */
function hitungB12(rapatList, periode, evidenceCheck) {
  const { start, end } = semesterEvaluationWindow(periode);
  // `semesterEvaluationWindow` mengonstruksi Date dari komponen LOKAL
  // (`new Date(tahun, bulan, hari)`), sedangkan `toDate()` di bawah mem-parse
  // string tanggal rapat sbg UTC (`new Date('YYYY-MM-DD')`) — di server dgn
  // zona waktu di depan UTC, representasi campuran ini bisa membuat tanggal
  // akhir bulan (mis. 30 Juni) keliru dianggap "di luar periode". Normalisasi
  // KEDUANYA ke UTC-midnight dari komponen Y/M/D yang SAMA (nilai start/end
  // dari helper tidak dihitung ulang, hanya representasi timezone-nya).
  const toUtcMidnight = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const periodeMulai = toUtcMidnight(start);
  const periodeAkhir = toUtcMidnight(end);

  const sah = [];
  const ditolak = [];

  for (const rapat of rapatList) {
    const alasan = [];
    const tanggal = toDate(rapat.tanggal_rapat);
    if (tanggal < periodeMulai || tanggal > periodeAkhir) alasan.push('Di luar rentang periode');
    if (!rapat.is_forkopimda) alasan.push('Bukan rapat Forkopimda (is_forkopimda=false)');
    if (!(rapat.topik_pengadaan || rapat.topik_pengelolaan || rapat.topik_penyaluran)) {
      alasan.push('Tidak ada topik ProSN (pengadaan/pengelolaan/penyaluran) yang dipilih');
    }
    const evidence = evidenceCheck ? evidenceCheck(rapat.id) : { lengkap: false, kurang: ['undangan', 'daftar_hadir', 'notulen'] };
    if (!evidence.lengkap) {
      alasan.push(`Bukti belum lengkap terikat langsung ke rapat ini: ${evidence.kurang.join(', ')}`);
    }

    if (alasan.length) {
      ditolak.push({ id: rapat.id, tanggal_rapat: rapat.tanggal_rapat, nama_forum: rapat.nama_forum, alasan });
    } else {
      sah.push(rapat);
    }
  }

  const perBulan = new Map();
  const cursor = new Date(periodeMulai.getFullYear(), periodeMulai.getMonth(), 1);
  const akhir = new Date(periodeAkhir.getFullYear(), periodeAkhir.getMonth(), 1);
  while (cursor <= akhir) {
    perBulan.set(monthKey(cursor), { total: 0, sah: 0, ditolak: 0, alasan_penolakan: [] });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  for (const rapat of rapatList) {
    const key = monthKey(toDate(rapat.tanggal_rapat));
    if (perBulan.has(key)) perBulan.get(key).total += 1;
  }
  for (const rapat of sah) {
    const key = monthKey(toDate(rapat.tanggal_rapat));
    if (perBulan.has(key)) perBulan.get(key).sah += 1;
  }
  for (const item of ditolak) {
    const key = monthKey(toDate(item.tanggal_rapat));
    if (perBulan.has(key)) {
      perBulan.get(key).ditolak += 1;
      perBulan.get(key).alasan_penolakan.push(`${item.nama_forum || 'Rapat'} (${new Date(item.tanggal_rapat).toLocaleDateString('id-ID')}): ${item.alasan.join('; ')}`);
    }
  }

  const bulanKosong = [...perBulan.entries()].filter(([, v]) => v.sah === 0).map(([bulan]) => bulan);
  const jumlahBulanEvaluasi = perBulan.size;
  // Perbandingan tier memakai nilai EKSAK (bukan yg sudah dibulatkan) agar
  // tidak ada bug pembulatan di batas tier (mis. 11/6=1.8333 harus tegas <2).
  const frekuensiEksak = jumlahBulanEvaluasi > 0 ? sah.length / jumlahBulanEvaluasi : 0;
  const frekuensiRataRataBulanan = Math.round(frekuensiEksak * 100) / 100;

  let skor;
  let alasanSkor;
  if (jumlahBulanEvaluasi === 0) {
    skor = 0; alasanSkor = 'Rentang periode tidak valid.';
  } else if (frekuensiEksak >= 2) {
    skor = 2.00;
    alasanSkor = `Terdapat ${sah.length} rapat Forkopimda sah dalam ${jumlahBulanEvaluasi} bulan evaluasi, setara rata-rata ${frekuensiRataRataBulanan.toFixed(2)} rapat per bulan (>= 2 kali/bulan).`;
  } else if (frekuensiEksak >= 1) {
    skor = 1.00;
    alasanSkor = `Terdapat ${sah.length} rapat Forkopimda sah dalam ${jumlahBulanEvaluasi} bulan evaluasi, setara rata-rata ${frekuensiRataRataBulanan.toFixed(2)} rapat per bulan (>= 1 dan < 2 kali/bulan).`;
  } else {
    skor = 0.00;
    alasanSkor = `Terdapat ${sah.length} rapat Forkopimda sah dalam ${jumlahBulanEvaluasi} bulan evaluasi, setara rata-rata ${frekuensiRataRataBulanan.toFixed(2)} rapat per bulan (< 1 kali/bulan, ambang batas terendah menurut redaksi "hanya 1 kali dalam 6 bulan").`;
  }

  return {
    skor,
    alasan: alasanSkor,
    detail: {
      jumlah_rapat_sah: sah.length,
      jumlah_rapat_tidak_sah: ditolak.length,
      jumlah_bulan_evaluasi: jumlahBulanEvaluasi,
      frekuensi_rata_rata_bulanan: frekuensiRataRataBulanan,
      hasil_faktual: Object.fromEntries([...perBulan.entries()].map(([bulan, v]) => [bulan, { jumlah_rapat_total: v.total, jumlah_rapat_sah: v.sah, jumlah_rapat_ditolak: v.ditolak, alasan_penolakan: v.alasan_penolakan }])),
      interpretasi_skor_internal:
        'Final Regulatory Scoring Decision (disahkan Project Owner 10 Agustus 2026): skor B.1.2 dihitung dari frekuensi rata-rata ' +
        'rapat Forkopimda sah per bulan selama satu semester (jumlah rapat sah dibagi jumlah bulan evaluasi) — >=2/bulan -> 2,00; ' +
        '>=1 dan <2/bulan -> 1,00; <1/bulan -> 0,00. Satu/beberapa bulan kosong TIDAK otomatis memaksa skor 0 — lihat bulan_kosong ' +
        'di bawah sbg fakta distribusi, terpisah dari penentuan skor.',
      bulan_kosong: bulanKosong,
      rapat_tidak_sah: ditolak,
    },
  };
}

module.exports = { hitungB12 };
