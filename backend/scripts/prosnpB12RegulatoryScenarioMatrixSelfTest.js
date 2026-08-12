'use strict';

/**
 * Audit "B.1.2 Regulatory Scoring Audit" (mandat CEA/Project Owner) — self-test
 * MURNI FUNGSI (tanpa DB, `hitungB12` sudah pure) yang menjalankan PERSIS
 * skenario matrix A-H dari mandat audit, membuktikan algoritma frekuensi
 * rata-rata bulanan (total rapat sah / 6 bulan evaluasi) yang SUDAH
 * diimplementasikan ("Final Regulatory Scoring Decision", disahkan Project
 * Owner 10 Agustus 2026) adalah interpretasi yang textually paling koheren
 * terhadap redaksi resmi Kepmendagri 700.1.1.4-180/2026 (dikonfirmasi
 * langsung dari `dokumenEPelara/Kepmendagri 700.1.1.4-1802026.pdf`, bukan
 * asumsi) — TIDAK ADA divergence, TIDAK ADA corrective diperlukan.
 *
 * Jalankan: node scripts/prosnpB12RegulatoryScenarioMatrixSelfTest.js
 */
const assert = require('assert');
const { hitungB12 } = require('../services/prosnp/ruleEngine/prosnpB12RuleEngine');

const PERIODE = { tahun: '2025', semester: '1' };
const evidenceLengkap = () => ({ lengkap: true, kurang: [] });

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}

function buatRapat(distribusi) {
  const list = [];
  let id = 1;
  for (const { bulan, jumlah } of distribusi) {
    for (let i = 0; i < jumlah; i++) {
      list.push({ id: id++, tanggal_rapat: `2025-${String(bulan).padStart(2, '0')}-15`, is_forkopimda: true, topik_pengadaan: true });
    }
  }
  return list;
}
function total(distribusi) { return distribusi.reduce((sum, d) => sum + d.jumlah, 0); }

console.log('=== SKENARIO MATRIX A-H (mandat audit B.1.2) — regulatory-supported score = frekuensi rata-rata bulanan (total_sah/6) ===');

const MATRIX = [
  { nama: 'A', distribusi: [{ bulan: 6, jumlah: 1 }], skorRegulasi: 0.00 },
  { nama: 'B', distribusi: [{ bulan: 6, jumlah: 2 }], skorRegulasi: 0.00 },
  { nama: 'C', distribusi: [{ bulan: 1, jumlah: 1 }, { bulan: 3, jumlah: 1 }, { bulan: 5, jumlah: 1 }], skorRegulasi: 0.00 },
  { nama: 'D', distribusi: [{ bulan: 1, jumlah: 2 }], skorRegulasi: 0.00 },
  { nama: 'E', distribusi: [1, 2, 3, 4, 5, 6].map((b) => ({ bulan: b, jumlah: 1 })), skorRegulasi: 1.00 },
  { nama: 'F', distribusi: [1, 2, 3, 4, 5, 6].map((b) => ({ bulan: b, jumlah: 2 })), skorRegulasi: 2.00 },
  { nama: 'G', distribusi: [{ bulan: 1, jumlah: 3 }, { bulan: 4, jumlah: 3 }], skorRegulasi: 1.00 },
  { nama: 'H', distribusi: [{ bulan: 1, jumlah: 2 }, { bulan: 2, jumlah: 1 }, { bulan: 4, jumlah: 3 }], skorRegulasi: 1.00 },
];

for (const { nama, distribusi, skorRegulasi } of MATRIX) {
  test(`SCENARIO ${nama} — total=${total(distribusi)}, distribusi=${JSON.stringify(distribusi)} -> skor regulasi ${skorRegulasi.toFixed(2)} (current algorithm HARUS sama, no divergence)`, () => {
    const hasil = hitungB12(buatRapat(distribusi), PERIODE, evidenceLengkap);
    assert.strictEqual(hasil.skor, skorRegulasi, `Divergence terdeteksi: current=${hasil.skor}, regulatory-supported=${skorRegulasi}.`);
  });
}

console.log('\n=== Skenario D secara khusus — "2 rapat dlm 1 bulan" (persis tier a literal) TIDAK otomatis 2.00 krn total keseluruhan semester tetap rendah ===');
test('D-detail — 2 rapat sah di Januari saja, 0 di 5 bulan lain -> rata-rata 0.33/bulan -> skor 0.00 (BUKAN 2.00 walau bulan Jan sendiri "2 kali dalam 1 bulan")', () => {
  const hasil = hitungB12(buatRapat([{ bulan: 1, jumlah: 2 }]), PERIODE, evidenceLengkap);
  assert.strictEqual(hasil.detail.jumlah_rapat_sah, 2);
  assert.strictEqual(hasil.detail.frekuensi_rata_rata_bulanan, 0.33);
  assert.strictEqual(hasil.skor, 0.00);
});

console.log('\n=== Case UAT nyata (read-only, TIDAK menyentuh DB) — 1 rapat sah, 20 Juni 2025 ===');
test('UAT case — 1 rapat sah tanggal 20 Juni 2025, Semester I -> skor 0.00 (current == regulatory-supported)', () => {
  const uatCase = [{ id: 1, tanggal_rapat: '2025-06-20', is_forkopimda: true, topik_pengadaan: true }];
  const hasil = hitungB12(uatCase, PERIODE, evidenceLengkap);
  assert.strictEqual(hasil.detail.jumlah_rapat_sah, 1);
  assert.strictEqual(hasil.detail.frekuensi_rata_rata_bulanan, 0.17);
  assert.strictEqual(hasil.skor, 0.00, 'Kasus faktual UAT harus tetap 0.00 — audit ini TIDAK mengubah hasil faktual yg sudah benar.');
});

console.log(`\nTotal: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
process.exit(0);
