'use strict';

/**
 * Rule engine B.1.2 — Koordinasi dengan Forkopimda.
 * Corrective pass (mandat §6.2/§8): evidence WAJIB per-rapat (bukan lagi satu
 * cek bukti untuk seluruh indikator) — satu undangan/notulen TIDAK BOLEH
 * melegitimasi rapat lain. `adaBuktiLengkap(rapatId)` mengecek UNDANGAN +
 * DAFTAR_HADIR + NOTULEN yang terikat LANGSUNG (entity_type/entity_id) ke
 * rapat tsb (lihat prosnpEvidenceGateService.rapatMemilikiBuktiLengkap).
 *
 * Skor:
 *   2,00 = setiap bulan kalender dalam periode punya >=2 rapat sah
 *   1,00 = setiap bulan kalender dalam periode punya >=1 rapat sah
 *   0,00 = ada bulan tanpa rapat sah sama sekali
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
  const semuaMin2 = [...perBulan.values()].every((v) => v.sah >= 2);
  const semuaMin1 = [...perBulan.values()].every((v) => v.sah >= 1);

  let skor;
  let alasanSkor;
  if (perBulan.size === 0) {
    skor = 0; alasanSkor = 'Rentang periode tidak valid.';
  } else if (semuaMin2) {
    skor = 2.00; alasanSkor = 'Setiap bulan dalam periode memiliki minimal 2 rapat Forkopimda sah (evidence per-rapat lengkap).';
  } else if (semuaMin1) {
    skor = 1.00; alasanSkor = 'Setiap bulan dalam periode memiliki minimal 1 rapat Forkopimda sah, belum konsisten 2x/bulan.';
  } else {
    skor = 0.00; alasanSkor = `Terdapat bulan tanpa rapat Forkopimda sah: ${bulanKosong.join(', ')}.`;
  }

  return {
    skor,
    alasan: alasanSkor,
    detail: {
      jumlah_rapat_sah: sah.length,
      jumlah_rapat_tidak_sah: ditolak.length,
      hasil_faktual: Object.fromEntries([...perBulan.entries()].map(([bulan, v]) => [bulan, { jumlah_rapat_total: v.total, jumlah_rapat_sah: v.sah, jumlah_rapat_ditolak: v.ditolak, alasan_penolakan: v.alasan_penolakan }])),
      interpretasi_skor_internal:
        'Redaksi Kepmendagri dapat ditafsirkan lebih dari satu cara. Interpretasi internal: skor 2,00 mensyaratkan SEMUA bulan ' +
        'dalam periode (bukan hanya rata-rata) punya >=2 rapat sah; skor 1,00 bila semua bulan >=1; skor 0 bila ada satu saja bulan kosong.',
      bulan_kosong: bulanKosong,
      rapat_tidak_sah: ditolak,
    },
  };
}

module.exports = { hitungB12 };
