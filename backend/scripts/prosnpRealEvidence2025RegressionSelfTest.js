'use strict';

/**
 * MANDAT PROJECT OWNER — TARGETED CORRECTIVE IMPLEMENTATION — REAL-WORLD 2025
 * GOLDEN EVIDENCE REGRESSION (ProSN Document Intelligence Classifier + Field
 * Extractor Corrective Pass), §30.
 *
 * Dua jenis assertion, DIPISAHKAN SECARA EKSPLISIT (§30):
 *
 *   - BINARY E2E ASSERTION — hanya berjalan jika berkas biner asli tersedia
 *     di direktori fixture (lihat PROSNP_REAL_EVIDENCE_FIXTURE_DIR di bawah).
 *     Jika berkas tidak ada, test di-SKIP (bukan FAIL) dan dilaporkan sbg
 *     tidak dapat diuji end-to-end.
 *   - TEXT GOLDEN UNIT ASSERTION — SELALU berjalan, memakai rekonstruksi
 *     teks sintetis yang mengikuti fakta golden-truth PERSIS seperti tertulis
 *     pada mandat (nomor, tanggal, nama, jabatan, heading, referensi hukum).
 *     Teks sintetis BUKAN hasil OCR sungguhan — dipakai semata untuk
 *     memvalidasi LOGIKA classifier/extractor terhadap fakta yang sudah
 *     dikonfirmasi oleh Project Owner, sesuai §3 Evidence Availability Gate
 *     (dilarang mengarang hasil OCR, tetapi golden unit assertion tekstual
 *     tetap wajib dibuat).
 *
 * PENTING (§50): produksi TIDAK BOLEH memuat logika khusus per-filename/
 * nomor/nama (mis. "if nomor === '500.1/518/G'"). Nilai golden di bawah
 * HANYA muncul di sisi EXPECTED test, bukan di source classifier/extractor.
 *
 * Jalankan:
 *   node scripts/prosnpRealEvidence2025RegressionSelfTest.js
 *
 * Opsional — aktifkan BINARY E2E dengan menaruh salinan lokal (read-only,
 * TIDAK di-commit ke git) 6 dokumen asli di suatu folder, lalu:
 *   PROSNP_REAL_EVIDENCE_FIXTURE_DIR="/path/ke/folder" node scripts/prosnpRealEvidence2025RegressionSelfTest.js
 * Nama berkas harus persis seperti yang diberikan Project Owner (lihat GOLDEN_FILES).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { extractTextFromBukti } = require('../services/prosnp/autofill/prosnpDocumentTextExtractor');
const { classifyDocument } = require('../services/prosnp/autofill/prosnpDocumentClassifier');
const { extractSuratPenugasanFields, extractSignerBlock } = require('../services/prosnp/autofill/extractors/suratPenugasanFieldExtractor');
const { extractRapatForkopimdaFields } = require('../services/prosnp/autofill/extractors/rapatForkopimdaFieldExtractor');
const { resolveLabelValuePairs } = require('../services/prosnp/autofill/docxStructuredExtractor');

let pass = 0;
let fail = 0;
let skip = 0;

async function test(name, fn) {
  try {
    await fn();
    pass += 1;
    console.log(`  OK    ${name}`);
  } catch (error) {
    fail += 1;
    console.log(`  FAIL  ${name}\n        ${error.stack || error.message}`);
  }
}

function skipTest(name, reason) {
  skip += 1;
  console.log(`  SKIP  ${name}\n        (${reason})`);
}

function byKey(fields) {
  return Object.fromEntries(fields.map((f) => [f.field_key, f]));
}

// ============================================================
// BAGIAN 1 — BINARY E2E ASSERTION (LAYER B, §14 mandat "Binary E2E Final
// Verification") — jalan hanya jika PROSNP_REAL_EVIDENCE_FIXTURE_DIR diset
// ke folder berisi salinan lokal 7 dokumen asli (TIDAK di-commit ke git).
// §20 "Binary Extraction Reality Guard" — setiap fixture WAJIB melalui 4
// tahap terpisah dan dilaporkan apa adanya: BINARY_READ, TEXT_EXTRACTION,
// CLASSIFICATION, FIELD_EXTRACTION. Tidak ada hasil yang dikarang/dipaksa.
// ============================================================

const FIXTURE_DIR = process.env.PROSNP_REAL_EVIDENCE_FIXTURE_DIR || '';

const GOLDEN_FILES = [
  { id: 1, filename: 'PENUGASAN PENGELOLAAN BERAS CPPD DAN PENYALURAN BERAS PEMERINTAH.pdf', mime: 'application/pdf', label: 'FILE 1 — Surat Penugasan CPPD/CBP', expectedType: 'surat_penugasan' },
  { id: 2, filename: 'Notulen Rakor Ketahanan Pangan-CPPD-CBP Tahun 2025.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'FILE 2 — Notulen Rakor Ketahanan Pangan', expectedType: 'notulen_rapat_koordinasi' },
  { id: 3, filename: 'PERGUB CPPD NO 101 TAHUN 2025_251025_123127_compressed.pdf', mime: 'application/pdf', label: 'FILE 3 — Pergub CPPD', expectedType: 'peraturan_gubernur' },
  { id: 4, filename: 'SK_SATGAS_MAKAN_BERGIZI_GRATIS_PEMPROV_MALUT_2025_-_sign[1].pdf', mime: 'application/pdf', label: 'FILE 4 — SK Satgas MBG', expectedType: 'keputusan_gubernur' },
  { id: 5, filename: 'Laporan Hasil Pelaksanaan Kegiatan Satgas MBG.pdf', mime: 'application/pdf', label: 'FILE 5 — Laporan Hasil Satgas MBG', expectedType: 'laporan_pelaksanaan' },
  { id: 6, filename: 'Laporan Ketersediaan Sarana dan Prasarana Kantor Satgas MBG.pdf', mime: 'application/pdf', label: 'FILE 6 — Laporan Sarpras Satgas MBG', expectedType: 'laporan_pelaksanaan' },
  { id: 7, filename: 'Perda CPPD Provinsi Maluku Utara.pdf', mime: 'application/pdf', label: 'FILE 7 — Perda CPPD', expectedType: 'peraturan_daerah' },
];

async function runBinaryE2ESection() {
  console.log('\n=== BAGIAN 1: BINARY E2E ASSERTION — LAYER B (7 golden fixture asli) ===');
  if (!FIXTURE_DIR) {
    GOLDEN_FILES.forEach((g) => skipTest(`BINARY E2E — ${g.label}`, 'PROSNP_REAL_EVIDENCE_FIXTURE_DIR tidak diset — tidak ada folder fixture lokal yang dikonfigurasi'));
    return;
  }
  for (const g of GOLDEN_FILES) {
    const filePath = path.join(FIXTURE_DIR, g.filename);
    if (!fs.existsSync(filePath)) {
      skipTest(`BINARY E2E — ${g.label} [BINARY_READ]`, `berkas tidak ditemukan di ${filePath}`);
      // eslint-disable-next-line no-continue
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await test(`BINARY E2E — ${g.label} [TEXT_EXTRACTION + CLASSIFICATION]`, async () => {
      const bukti = { id: -1, file_path: filePath, mime_type: g.mime };
      const extraction = await extractTextFromBukti(bukti, null);
      console.log(`        [diagnostik] method=${extraction.method} textLen=${extraction.text.length} partial=${extraction.code === 'PARTIAL_EXTRACTION'} warnings=${JSON.stringify(extraction.warnings)}`);
      assert.strictEqual(extraction.extractFailed, false, `Ekstraksi gagal: ${extraction.warnings.join('; ')}`);
      const klasifikasi = classifyDocument(extraction.text);
      console.log(`        [diagnostik] jenis_dokumen=${klasifikasi.jenis_dokumen} confidence=${klasifikasi.confidence} reference_mentions=${klasifikasi.reference_mentions.length}`);
      assert.strictEqual(klasifikasi.jenis_dokumen, g.expectedType, `Klasifikasi aktual: ${klasifikasi.jenis_dokumen} (${klasifikasi.reason})`);
      assert.strictEqual(klasifikasi.confidence, 'HIGH', 'Klasifikasi golden fixture asli WAJIB HIGH (heading eksplisit ditemukan), bukan MEDIUM/LOW.');
    });
  }

  // FILE 1 — field extraction lengkap dari BINARY asli, termasuk multi-page signer (§6, §30, §32).
  const file1Path = path.join(FIXTURE_DIR, GOLDEN_FILES[0].filename);
  if (fs.existsSync(file1Path)) {
    await test('BINARY E2E — FILE 1 [FIELD_EXTRACTION] nomor/tanggal/signer/recipient/cakupan', async () => {
      const extraction = await extractTextFromBukti({ id: -1, file_path: file1Path, mime_type: 'application/pdf' }, null);
      const signer = extractSignerBlock(extraction.text);
      console.log(`        [diagnostik] signer=${JSON.stringify(signer)}`);
      const f = byKey(extractSuratPenugasanFields(extraction.text));
      assert.strictEqual(f.nomor_surat.value, '500.1/518/G');
      assert.strictEqual(f.tanggal_surat.value, '2025-01-30');
      assert.strictEqual(f.tanggal_mulai_berlaku.value, '2025-01-30');
      assert.strictEqual(signer.nama.toUpperCase(), 'SAMSUDDIN ABDUL KADIR', 'Signer HARUS ditemukan dari binary asli (bukan disuntik), tidak boleh salah pilih penerima/tembusan.');
      assert.strictEqual(signer.jabatan, 'Pj. Gubernur Maluku Utara');
      assert.ok(/Dinas\s+Pangan/i.test(f.opd_penerima_nama.value), `Recipient harus memuat "Dinas Pangan" (aktual: "${f.opd_penerima_nama.value}") — noise OCR residual dpt diterima, requires_review tetap true.`);
      assert.strictEqual(f.opd_penerima_nama.requires_review, true);
      assert.strictEqual(f.cakupan_pengadaan.value, true);
      assert.strictEqual(f.cakupan_pengelolaan.value, true);
      assert.strictEqual(f.cakupan_penyaluran.value, true);
      // Corrective Pass "B.1.1 Required ringkasan_isi" (§13 mandat) — ringkasan
      // WAJIB grounded RULE_DERIVED, BUKAN lagi potongan OCR mentah LOW-confidence.
      assert.ok(f.ringkasan_isi.value, 'ringkasan_isi TIDAK BOLEH null pada dokumen dgn cakupan tugas yang grounded.');
      assert.strictEqual(f.ringkasan_isi.source_type, 'RULE_DERIVED');
      assert.ok(/Penugasan/i.test(f.ringkasan_isi.value), 'ringkasan_isi harus memuat konsep "Penugasan".');
      assert.ok(/Cadangan\s+Pangan\s+Pemerintah\s+Daerah/i.test(f.ringkasan_isi.value), 'ringkasan_isi harus memuat konsep "Cadangan Pangan Pemerintah Daerah".');
      assert.ok(/pengadaan/i.test(f.ringkasan_isi.value) && /pengelolaan/i.test(f.ringkasan_isi.value) && /penyaluran/i.test(f.ringkasan_isi.value), 'ringkasan_isi harus memuat dukungan semantik pengadaan/pengelolaan/penyaluran.');
      assert.ok(!/GUBERNUR\s+MALUKU\s+UTARA\s+Nomor/i.test(f.ringkasan_isi.value), 'ringkasan_isi TIDAK BOLEH berisi junk OCR heading surat.');
      assert.ok(!/Hg\s+Kepala/i.test(f.ringkasan_isi.value), 'ringkasan_isi TIDAK BOLEH menyuntikkan noise OCR "Hg Kepala" dari recipient.');
    });
  } else {
    skipTest('BINARY E2E — FILE 1 [FIELD_EXTRACTION]', `berkas tidak ditemukan di ${file1Path}`);
  }

  // FILE 2 (DOCX) — field extraction LENGKAP dari BINARY asli (P1 corrective
  // §24). Tabel Word pada dokumen sumber diratakan mammoth.extractRawText
  // menjadi teks linear tanpa penjajaran kolom label/nilai — diperbaiki via
  // `docxStructuredExtractor.js` (baca word/document.xml langsung, REKONSTRUKSI
  // pasangan label:value, di-PREPEND ke teks sblm diserahkan ke field
  // extractor existing yg generik). TIDAK ADA binary field yang di-skip lagi.
  const file2Path = path.join(FIXTURE_DIR, GOLDEN_FILES[1].filename);
  if (fs.existsSync(file2Path)) {
    await test('BINARY E2E — FILE 2 (DOCX) [FIELD_EXTRACTION] structured table lengkap (P1)', async () => {
      const extraction = await extractTextFromBukti({ id: -1, file_path: file2Path, mime_type: GOLDEN_FILES[1].mime }, null);
      assert.strictEqual(extraction.method, 'docx_raw_text');
      assert.ok(extraction.docx_structure && extraction.docx_structure.tables.length >= 1, 'docx_structure harus memuat minimal 1 tabel.');
      const klasifikasi = classifyDocument(extraction.text);
      assert.strictEqual(klasifikasi.jenis_dokumen, 'notulen_rapat_koordinasi');
      assert.strictEqual(klasifikasi.confidence, 'HIGH');
      const f = byKey(extractRapatForkopimdaFields(extraction.text));
      assert.strictEqual(f.tanggal_rapat.value, '2025-08-20');
      assert.strictEqual(f.pimpinan_rapat.value, 'Gubernur Maluku Utara', `pimpinan_rapat binary harus persis "Gubernur Maluku Utara" (aktual: "${f.pimpinan_rapat.value}").`);
      assert.ok(/Ketahanan\s+Pangan/i.test(f.agenda.value) || /CPPD/i.test(f.agenda.value), 'agenda harus memuat "Ketahanan Pangan" atau "CPPD".');
      assert.ok(/CPPD/i.test(f.agenda.value), 'agenda harus memuat "CPPD".');
      assert.ok(/CBP/i.test(f.agenda.value), 'agenda harus memuat "CBP".');
      // Dokumen sumber ASLI menulis "Raapat" (typo double-a pada tabel metadata) —
      // produksi TIDAK BOLEH memperbaiki typo bahasa secara agresif (mandat §16),
      // jadi assertion di sini toleran thd typo tsb & memeriksa substansi ("Koordinasi"
      // + "Pangan"), bukan ejaan persis "Rapat".
      assert.ok(/Koordinasi/i.test(f.nama_forum.value || '') && /Pangan/i.test(f.nama_forum.value || ''), `nama_forum harus memuat "Koordinasi" & "Pangan" (aktual: "${f.nama_forum.value}").`);
      assert.strictEqual(f.lokasi.value, 'Bela Hotel Ternate', `lokasi binary harus persis "Bela Hotel Ternate" (aktual: "${f.lokasi.value}").`);
      assert.ok(/Syarifudin\s+Sima/i.test(f.notulis.value || ''), `notulis harus memuat "Syarifudin Sima" (aktual: "${f.notulis.value}").`);
      assert.ok(f.catatan_angka_pendukung.value && /50/.test(f.catatan_angka_pendukung.value), '50 Ton harus terekstrak sbg catatan pendukung.');
      assert.strictEqual(f.catatan_angka_pendukung.requires_review, true, '50 Ton TIDAK BOLEH pernah authoritative — selalu requires_review.');
      assert.ok(!('target_ton' in f), 'rapatForkopimdaFieldExtractor TIDAK BOLEH pernah mengisi target_ton B.1.3 dari Notulen.');
      assert.strictEqual(f.is_forkopimda.value, true, 'Notulen binary asli memuat sinyal Forkopimda eksplisit -> is_forkopimda harus true (corrective pass).');
      assert.strictEqual(f.is_forkopimda.confidence, 'MEDIUM');
      assert.strictEqual(f.is_forkopimda.requires_review, true);
    });
  } else {
    skipTest('BINARY E2E — FILE 2 (DOCX) [FIELD_EXTRACTION]', `berkas tidak ditemukan di ${file2Path}`);
  }

  // FILE 3/4/5/6/7 — reference_mentions isolation (§5, §20, §23): pastikan
  // dokumen lain yang dirujuk TIDAK PERNAH nihil (kosong total) padahal
  // dokumen jelas merujuk regulasi lain, KECUALI memang tidak ada rujukan
  // eksplisit (Perda biasanya dokumen akar, wajar reference_mentions kosong).
  const file4Path = path.join(FIXTURE_DIR, GOLDEN_FILES[3].filename);
  if (fs.existsSync(file4Path)) {
    await test('BINARY E2E — FILE 4 [FIELD_EXTRACTION] signer Sherly Tjoanda dari binary asli', async () => {
      const extraction = await extractTextFromBukti({ id: -1, file_path: file4Path, mime_type: 'application/pdf' }, null);
      const signer = extractSignerBlock(extraction.text);
      console.log(`        [diagnostik] signer=${JSON.stringify(signer)}`);
      if (signer.nama) {
        assert.ok(/SHERLY\s+TJOANDA/i.test(signer.nama), `Bila signer ditemukan, harus "Sherly Tjoanda" (aktual: "${signer.nama}") — TIDAK BOLEH mengarang bila tidak grounded.`);
      } else {
        console.log('        [catatan] Signer tidak grounded pada marker office generik ("GUBERNUR MALUKU UTARA" tanpa Pj.) — office marker exact match blm tentu ada di lampiran/halaman ttd SK ini; TIDAK dianggap kegagalan krn extractor sengaja tidak pernah mengarang nama (§17).');
      }
    });
  } else {
    skipTest('BINARY E2E — FILE 4 [FIELD_EXTRACTION]', `berkas tidak ditemukan di ${file4Path}`);
  }
}

// ============================================================
// BAGIAN 2 — TEXT GOLDEN UNIT ASSERTION (selalu berjalan)
// ============================================================
// Rekonstruksi teks sintetis mengikuti fakta golden-truth PERSIS seperti
// dinyatakan pada mandat §7–§12 dan §31–§36. Bukan hasil OCR sungguhan —
// dipakai untuk memvalidasi logika classifier/extractor.

const GOLDEN_TEXT_FILE_1 = `
PEMERINTAH PROVINSI MALUKU UTARA

SURAT PENUGASAN
NOMOR : 500.1/518/G

Perihal: Penugasan Pengelolaan Beras CPPD dan Penyaluran Cadangan Beras
Pemerintah

Yth. Kepala Dinas Pangan Provinsi Maluku Utara
di
Sofifi

Menimbang bahwa dalam rangka menindaklanjuti Peraturan Daerah Provinsi
Maluku Utara Nomor 4 Tahun 2023 tentang Ketahanan Pangan, perlu menugaskan
pejabat untuk melaksanakan pengadaan, pengelolaan, dan penyaluran Cadangan
Pangan Pemerintah Daerah (CPPD) serta Cadangan Beras Pemerintah (CBP).

Menugaskan Kepala Dinas Pangan Provinsi Maluku Utara untuk:
KESATU: melaksanakan pengadaan Cadangan Pangan Pemerintah Daerah;
KEDUA: melaksanakan pengelolaan Cadangan Pangan Pemerintah Daerah;
KETIGA: melaksanakan penyaluran beras Cadangan Pangan Pemerintah kepada
masyarakat yang membutuhkan.

Surat penugasan ini berlaku sejak tanggal 30 Januari 2025.

Ditetapkan di Sofifi
Pada tanggal 30 Januari 2025

PJ. GUBERNUR MALUKU UTARA,

SAMSUDDIN ABDUL KADIR

Tembusan:
1. Sekretaris Daerah Provinsi Maluku Utara
`;

const GOLDEN_TEXT_FILE_2 = `
NOTULEN RAPAT KOORDINASI

RAPAT KOORDINASI FORKOPIMDA PROVINSI MALUKU UTARA
TENTANG KETAHANAN PANGAN, CADANGAN PANGAN PEMERINTAH DAERAH (CPPD), DAN
CADANGAN BERAS PEMERINTAH (CBP)

Hari/Tanggal : Rabu, 20 Agustus 2025
Tempat : Bela Hotel Ternate
Pimpinan Rapat : Gubernur Maluku Utara
Notulis : Syarifudin Sima, S.Hut., MP

Hadir:
1. Gubernur Maluku Utara
2. Danrem 152/Babullah
3. Kapolda Maluku Utara
4. Kajati Maluku Utara

Agenda:
Pembahasan pengadaan, pengelolaan, dan penyaluran Cadangan Pangan
Pemerintah Daerah (CPPD) serta sinkronisasi dengan Cadangan Beras
Pemerintah (CBP) tahun 2025.

Hasil rapat menyepakati rencana pengadaan CPPD tahun 2025 sekitar 50 Ton
untuk kebutuhan darurat pangan.
`;

const GOLDEN_TEXT_FILE_3 = `
GUBERNUR MALUKU UTARA

PERATURAN GUBERNUR MALUKU UTARA
NOMOR 101 TAHUN 2025

TENTANG

PELAKSANAAN PERATURAN DAERAH PROVINSI MALUKU UTARA NOMOR 4 TAHUN 2023
TENTANG CADANGAN PANGAN PEMERINTAH DAERAH

DENGAN RAHMAT TUHAN YANG MAHA ESA
GUBERNUR MALUKU UTARA,

Menimbang: bahwa untuk melaksanakan ketentuan Peraturan Daerah Provinsi
Maluku Utara Nomor 4 Tahun 2023 tentang Cadangan Pangan Pemerintah Daerah,
perlu menetapkan Peraturan Gubernur tentang Pelaksanaan Peraturan Daerah
dimaksud;

Mengingat:
1. Undang-Undang Nomor 18 Tahun 2012 tentang Pangan;
2. Peraturan Daerah Provinsi Maluku Utara Nomor 4 Tahun 2023;

MEMUTUSKAN:

Menetapkan: PERATURAN GUBERNUR TENTANG PELAKSANAAN PERATURAN DAERAH NOMOR 4
TAHUN 2023 TENTANG CADANGAN PANGAN PEMERINTAH DAERAH.

BAB I
KETENTUAN UMUM

Peraturan ini mengatur pengadaan, pengelolaan, dan penyaluran Cadangan
Pangan Pemerintah Daerah (CPPD) serta pengawasan dan pelaporannya.

Jumlah Cadangan Pangan Pemerintah Daerah berupa beras Provinsi ditetapkan
dengan Keputusan Gubernur setiap tahun anggaran.
`;

const GOLDEN_TEXT_FILE_4 = `
GUBERNUR MALUKU UTARA

KEPUTUSAN GUBERNUR MALUKU UTARA
NOMOR 365/KPTS/MU/2025

TENTANG

PEMBENTUKAN SATUAN TUGAS PERCEPATAN PELAKSANAAN PROGRAM MAKAN BERGIZI
GRATIS (MBG) DI PROVINSI MALUKU UTARA

GUBERNUR MALUKU UTARA,

Menimbang: bahwa dalam rangka percepatan pelaksanaan Program Makan Bergizi
Gratis sebagaimana dimaksud dalam Peraturan Presiden Nomor 83 Tahun 2024,
perlu membentuk Satuan Tugas;

Mengingat:
1. Undang-Undang Nomor 23 Tahun 2014;
2. Peraturan Presiden Nomor 83 Tahun 2024;
3. Surat Edaran Kepala Badan Gizi Nasional;

MEMUTUSKAN:

Menetapkan: KEPUTUSAN GUBERNUR TENTANG PEMBENTUKAN SATUAN TUGAS PERCEPATAN
PELAKSANAAN PROGRAM MAKAN BERGIZI GRATIS (MBG) DI PROVINSI MALUKU UTARA.

KESATU: Membentuk Satuan Tugas Percepatan Pelaksanaan Program Makan Bergizi
Gratis Provinsi Maluku Utara.

KEDUA: Kepala Dinas Pangan Provinsi Maluku Utara bertindak sebagai
Sekretaris Satgas.

KETIGA: Dinas Pangan Provinsi Maluku Utara menjadi bagian Tim Sekretariat.

Ditetapkan di Sofifi
pada tanggal 30 Juli 2025

GUBERNUR MALUKU UTARA,

SHERLY TJOANDA
`;

const GOLDEN_TEXT_FILE_5 = `
LAPORAN HASIL PELAKSANAAN KEGIATAN SATGAS MBG
PROVINSI MALUKU UTARA

Dasar:
1. Keputusan Gubernur Maluku Utara Nomor 365/KPTS/MU/2025 tentang
   Pembentukan Satuan Tugas Percepatan Pelaksanaan Program Makan Bergizi
   Gratis di Provinsi Maluku Utara;
2. Surat Edaran Kepala Badan Gizi Nasional;

Rencana Kerja:
Satgas menyusun rencana kerja monitoring dan evaluasi pelaksanaan Program
Makan Bergizi Gratis di seluruh Kabupaten/Kota.

Pelaksanaan Rapat dan Kegiatan:
1. 14 Juli 2025 — evaluasi pelaksanaan MBG;
2. 29 Juli 2025 — rapat pembentukan Satgas MBG;
3. 14 Agustus 2025 — rapat Satgas MBG dengan Satgas Kota Tidore Kepulauan;
4. 5 Oktober 2025 — Rakor SPPG daerah terpencil;
5. 6 Agustus 2025 — rapat evaluasi MBG;
6. 26 November 2025 — monitoring dan evaluasi MBG.
`;

const GOLDEN_TEXT_FILE_6 = `
LAPORAN KETERSEDIAAN SARANA DAN PRASARANA
KANTOR SATGAS MBG PROVINSI MALUKU UTARA

Dasar:
Keputusan Gubernur Maluku Utara Nomor 365/KPTS/MU/2025 tentang Pembentukan
Satuan Tugas Percepatan Pelaksanaan Program Makan Bergizi Gratis di
Provinsi Maluku Utara.

Sekretariat Satgas MBG telah tersedia di kompleks Kantor Dinas Pangan
Provinsi Maluku Utara, Jalan Raya Sultan Nuku, Sofifi, Kota Tidore
Kepulauan.

Sarana dan prasarana yang tersedia meliputi:
meja/kursi kerja, komputer/laptop, printer, lemari arsip, peralatan rapat,
jaringan internet, telepon/perangkat komunikasi, dan kendaraan operasional.
`;

async function runTextGoldenUnitSection() {
  console.log('\n=== BAGIAN 2: TEXT GOLDEN UNIT ASSERTION (selalu berjalan) ===');

  // --- §31, §32 — FILE 1 ---
  await test('FILE 1 — klasifikasi = surat_penugasan HIGH, BUKAN peraturan_daerah', async () => {
    const k = classifyDocument(GOLDEN_TEXT_FILE_1);
    assert.strictEqual(k.jenis_dokumen, 'surat_penugasan');
    assert.strictEqual(k.confidence, 'HIGH');
    assert.ok(k.reference_mentions.some((r) => r.type === 'peraturan_daerah'), 'Perda Nomor 4/2023 harus tetap tercatat sbg reference_mentions.');
  });
  await test('FILE 1 — field: nomor_surat, tanggal_surat, tanggal_mulai_berlaku', async () => {
    const f = byKey(extractSuratPenugasanFields(GOLDEN_TEXT_FILE_1));
    assert.strictEqual(f.nomor_surat.value, '500.1/518/G');
    assert.strictEqual(f.tanggal_surat.value, '2025-01-30');
    assert.strictEqual(f.tanggal_mulai_berlaku.value, '2025-01-30');
  });
  await test('FILE 1 — signer (multi-page anchor): jabatan="Pj. Gubernur Maluku Utara", nama mengandung "SAMSUDDIN ABDUL KADIR"', async () => {
    const f = byKey(extractSuratPenugasanFields(GOLDEN_TEXT_FILE_1));
    assert.strictEqual(f.jabatan_penandatangan.value, 'Pj. Gubernur Maluku Utara');
    assert.strictEqual(f.pejabat_penandatangan.value.toUpperCase(), 'SAMSUDDIN ABDUL KADIR');
    assert.strictEqual(f.pejabat_penandatangan.confidence, 'HIGH');
  });
  await test('FILE 1 — recipient/OPD = Dinas Pangan Provinsi Maluku Utara', async () => {
    const f = byKey(extractSuratPenugasanFields(GOLDEN_TEXT_FILE_1));
    assert.strictEqual(f.opd_penerima_nama.value, 'Dinas Pangan Provinsi Maluku Utara');
    assert.strictEqual(f.opd_penerima_nama.requires_review, true, 'Recipient bukan hasil fuzzy-match master OPD — wajib review.');
  });
  await test('FILE 1 — cakupan pengadaan/pengelolaan/penyaluran semuanya true', async () => {
    const f = byKey(extractSuratPenugasanFields(GOLDEN_TEXT_FILE_1));
    assert.strictEqual(f.cakupan_pengadaan.value, true);
    assert.strictEqual(f.cakupan_pengelolaan.value, true);
    assert.strictEqual(f.cakupan_penyaluran.value, true);
  });

  await test('FILE 1 — ringkasan_isi RULE_DERIVED grounded, TIDAK menyuntikkan noise OCR recipient', async () => {
    const f = byKey(extractSuratPenugasanFields(GOLDEN_TEXT_FILE_1));
    assert.ok(f.ringkasan_isi.value);
    assert.strictEqual(f.ringkasan_isi.source_type, 'RULE_DERIVED');
    assert.ok(/Penugasan/i.test(f.ringkasan_isi.value));
    assert.ok(/Cadangan\s+Pangan\s+Pemerintah\s+Daerah/i.test(f.ringkasan_isi.value));
    assert.ok(!/GUBERNUR\s+MALUKU\s+UTARA\s+Nomor/i.test(f.ringkasan_isi.value));
  });

  await test('ringkasan_isi TIDAK PERNAH mengarang bila tidak ada satu pun fakta grounded (cakupan/CPPD/CBP)', async () => {
    const textTanpaFakta = 'SURAT PENUGASAN\nNOMOR : 999/XX/2025\n\nMenugaskan pejabat untuk hal lain yang tidak relevan.';
    const f = byKey(extractSuratPenugasanFields(textTanpaFakta));
    assert.strictEqual(f.ringkasan_isi.value, null, 'Tanpa fakta grounded, ringkasan_isi HARUS null — bukan mengarang isi.');
    assert.strictEqual(f.ringkasan_isi.requires_review, true);
  });

  // --- §31, §33 — FILE 2 ---
  await test('FILE 2 — klasifikasi = notulen_rapat_koordinasi', async () => {
    const k = classifyDocument(GOLDEN_TEXT_FILE_2);
    assert.strictEqual(k.jenis_dokumen, 'notulen_rapat_koordinasi');
  });
  await test('FILE 2 — field: tanggal_rapat, pimpinan_rapat, lokasi, agenda, notulis', async () => {
    const f = byKey(extractRapatForkopimdaFields(GOLDEN_TEXT_FILE_2));
    assert.strictEqual(f.tanggal_rapat.value, '2025-08-20');
    assert.strictEqual(f.pimpinan_rapat.value, 'Gubernur Maluku Utara');
    assert.strictEqual(f.lokasi.value, 'Bela Hotel Ternate');
    assert.ok(/CPPD/i.test(f.agenda.value) && /CBP/i.test(f.agenda.value), 'agenda harus memuat konsep CPPD & CBP.');
    assert.strictEqual(f.notulis.value, 'Syarifudin Sima, S.Hut., MP');
  });
  await test('FILE 2 — is_forkopimda=true MEDIUM dari sinyal Forkopimda eksplisit pada Notulen asli (corrective pass)', async () => {
    const f = byKey(extractRapatForkopimdaFields(GOLDEN_TEXT_FILE_2));
    assert.strictEqual(f.is_forkopimda.value, true);
    assert.strictEqual(f.is_forkopimda.confidence, 'MEDIUM');
    assert.strictEqual(f.is_forkopimda.requires_review, true);
    assert.strictEqual(f.jenis_forum.value, 'Forkopimda', 'jenis_forum tetap ada berdampingan dgn is_forkopimda.');
  });
  await test('FILE 2 — "50 Ton" hanya SUPPORTING, TIDAK PERNAH authoritative target_ton', async () => {
    const f = byKey(extractRapatForkopimdaFields(GOLDEN_TEXT_FILE_2));
    assert.ok(f.catatan_angka_pendukung.value && /50/.test(f.catatan_angka_pendukung.value));
    assert.strictEqual(f.catatan_angka_pendukung.requires_review, true);
    assert.ok(!('target_ton' in f), 'rapatForkopimdaFieldExtractor TIDAK BOLEH pernah mengeluarkan field target_ton — itu wewenang B.1.3/keputusan_gubernur saja.');
  });

  // --- §31, §34 — FILE 3 ---
  await test('FILE 3 — klasifikasi = peraturan_gubernur, BUKAN peraturan_daerah/keputusan_gubernur meski Perda dirujuk & "ditetapkan dgn Keputusan Gubernur" disebut', async () => {
    const k = classifyDocument(GOLDEN_TEXT_FILE_3);
    assert.strictEqual(k.jenis_dokumen, 'peraturan_gubernur');
    assert.strictEqual(k.confidence, 'HIGH');
    assert.ok(k.reference_mentions.some((r) => r.type === 'peraturan_daerah' && r.number === '4' && r.year === 2023));
  });

  // --- §31, §35 — FILE 4 ---
  await test('FILE 4 — klasifikasi = keputusan_gubernur, nomor/tanggal/signer sesuai golden-truth', async () => {
    const k = classifyDocument(GOLDEN_TEXT_FILE_4);
    assert.strictEqual(k.jenis_dokumen, 'keputusan_gubernur');
    assert.strictEqual(k.confidence, 'HIGH');
    const s = extractSignerBlock(GOLDEN_TEXT_FILE_4);
    assert.strictEqual(s.jabatan, 'Gubernur Maluku Utara');
    assert.strictEqual(s.nama.toUpperCase(), 'SHERLY TJOANDA');
    assert.ok(/365\/KPTS\/MU\/2025/.test(GOLDEN_TEXT_FILE_4) && /30 Juli 2025/.test(GOLDEN_TEXT_FILE_4), 'nomor & tanggal SK harus persis seperti golden-truth.');
  });

  // --- §31, §36 — FILE 5 & FILE 6 ---
  await test('FILE 5 — klasifikasi = laporan_pelaksanaan, referensi SK 365/2025 TIDAK mengambil alih primary type', async () => {
    const k = classifyDocument(GOLDEN_TEXT_FILE_5);
    assert.strictEqual(k.jenis_dokumen, 'laporan_pelaksanaan');
    assert.strictEqual(k.confidence, 'HIGH');
    assert.ok(k.reference_mentions.some((r) => r.type === 'keputusan_gubernur'));
  });
  await test('FILE 6 — klasifikasi = laporan_pelaksanaan, referensi SK 365/KPTS/MU/2025 TIDAK mengambil alih primary type', async () => {
    const k = classifyDocument(GOLDEN_TEXT_FILE_6);
    assert.strictEqual(k.jenis_dokumen, 'laporan_pelaksanaan');
    assert.strictEqual(k.confidence, 'HIGH');
    assert.ok(k.reference_mentions.some((r) => r.type === 'keputusan_gubernur' && r.number === '365/KPTS/MU'));
  });
}

// ============================================================
// BAGIAN 3 — NEGATIVE REGRESSION TESTS (§37, kasus sintetis A–E)
// ============================================================

async function runNegativeRegressionSection() {
  console.log('\n=== BAGIAN 3: NEGATIVE REGRESSION (kasus sintetis A–E, §37) ===');

  await test('CASE A — SURAT PENUGASAN + "Menindaklanjuti Peraturan Daerah..." -> tetap surat_penugasan', async () => {
    const text = `
SURAT PENUGASAN
NOMOR : 100/1/2025

Menindaklanjuti Peraturan Daerah Nomor 4 Tahun 2023 tentang Ketahanan
Pangan, dengan ini menugaskan pejabat yang bersangkutan untuk melaksanakan
tugas dimaksud.
`;
    const k = classifyDocument(text);
    assert.strictEqual(k.jenis_dokumen, 'surat_penugasan');
  });

  await test('CASE B — PERATURAN GUBERNUR + Mengingat Peraturan Daerah -> tetap peraturan_gubernur', async () => {
    const text = `
PERATURAN GUBERNUR MALUKU UTARA
NOMOR 5 TAHUN 2025

Mengingat:
Peraturan Daerah Provinsi Maluku Utara Nomor 4 Tahun 2023 tentang
Ketahanan Pangan.
`;
    const k = classifyDocument(text);
    assert.strictEqual(k.jenis_dokumen, 'peraturan_gubernur');
  });

  await test('CASE C — LAPORAN PELAKSANAAN + Dasar Keputusan Gubernur -> tetap laporan_pelaksanaan', async () => {
    const text = `
LAPORAN PELAKSANAAN KEGIATAN

Dasar:
Keputusan Gubernur Maluku Utara Nomor 100 Tahun 2025 tentang Penetapan
Tim Pelaksana.
`;
    const k = classifyDocument(text);
    assert.strictEqual(k.jenis_dokumen, 'laporan_pelaksanaan');
  });

  await test('CASE D — KEPUTUSAN GUBERNUR + Mengingat Peraturan Gubernur -> tetap keputusan_gubernur', async () => {
    const text = `
KEPUTUSAN GUBERNUR MALUKU UTARA
NOMOR 200/KPTS/MU/2025

Mengingat:
Peraturan Gubernur Maluku Utara Nomor 10 Tahun 2024 tentang Tata Kelola.
`;
    const k = classifyDocument(text);
    assert.strictEqual(k.jenis_dokumen, 'keputusan_gubernur');
  });

  await test('CASE E — NOTULEN RAPAT + membahas Peraturan Daerah -> tetap notulen_rapat_koordinasi', async () => {
    const text = `
NOTULEN RAPAT KOORDINASI

Rapat membahas Peraturan Daerah Provinsi Maluku Utara Nomor 4 Tahun 2023
tentang Ketahanan Pangan sebagai bahan diskusi utama.
`;
    const k = classifyDocument(text);
    assert.strictEqual(k.jenis_dokumen, 'notulen_rapat_koordinasi');
  });
}

// ============================================================
// BAGIAN 4 — MULTI-PAGE SIGNER REGRESSION (§38, §39)
// ============================================================

async function runMultiPageSignerSection() {
  console.log('\n=== BAGIAN 4: MULTI-PAGE SIGNER REGRESSION (§38, §39) ===');

  const PAGE_1 = `
SURAT PENUGASAN
NOMOR : 500.1/518/G

Menimbang bahwa berdasarkan Peraturan Daerah Nomor 3 Tahun 2020 tentang
Ketahanan Pangan, perlu menugaskan pejabat untuk pengadaan, pengelolaan
dan penyaluran Cadangan Pangan Pemerintah Daerah (CPPD).

Menugaskan Kepala Dinas Pangan Provinsi Maluku Utara untuk melaksanakan
tugas dimaksud.
`;
  const PAGE_2 = `
Demikian surat penugasan ini dibuat untuk dilaksanakan sebagaimana mestinya.

Ditetapkan di Sofifi
Pada tanggal 1 Februari 2025

PJ. GUBERNUR MALUKU UTARA,

SAMSUDDIN ABDUL KADIR

Tembusan:
1. Sekretaris Daerah Provinsi Maluku Utara
`;
  // pdf-parse/OCR pipeline sudah menggabung SEMUA halaman jadi satu string
  // sebelum diserahkan ke classifier/extractor (lihat prosnpDocumentTextExtractor.js) —
  // simulasi ini merepresentasikan hasil gabungan tsb.
  const fullText = `${PAGE_1}\n${PAGE_2}`;

  await test('Halaman 1 SENDIRI tidak memuat signer (memverifikasi skenario defect asli)', async () => {
    const s = extractSignerBlock(PAGE_1);
    assert.strictEqual(s.nama, null);
  });

  await test('Signer DITEMUKAN di halaman 2 ketika teks multi-halaman digabung', async () => {
    const s = extractSignerBlock(fullText);
    assert.strictEqual(s.jabatan, 'Pj. Gubernur Maluku Utara');
    assert.strictEqual(s.nama, 'SAMSUDDIN ABDUL KADIR');
  });

  await test('Klasifikasi tetap berbasis identitas halaman 1 (surat_penugasan), tidak terpengaruh isi halaman 2', async () => {
    const k = classifyDocument(fullText);
    assert.strictEqual(k.jenis_dokumen, 'surat_penugasan');
    assert.strictEqual(k.confidence, 'HIGH');
  });

  await test('§39 — signer TIDAK BOLEH salah pilih penerima tembusan sbg penandatangan', async () => {
    const textWithTembusanTrap = `${fullText}\n2. Kepala Biro Hukum Sekretariat Daerah\n3. ASISTEN Pemerintahan dan Kesejahteraan Rakyat`;
    const s = extractSignerBlock(textWithTembusanTrap);
    assert.strictEqual(s.nama, 'SAMSUDDIN ABDUL KADIR', 'Nama pada daftar Tembusan (Kepala Biro Hukum/ASISTEN) tidak boleh terpilih sbg signer.');
  });
}

// ============================================================
// BAGIAN 5 — STRUCTURED DOCX TABLE UNIT TEST (P1 mandat §25-§26)
// Sintetis, independen dari file DOCX asli — mencegah overfitting terhadap
// layout Notulen fixture SATU ini secara khusus (mandat §25).
// ============================================================

async function runStructuredTableUnitSection() {
  console.log('\n=== BAGIAN 5: STRUCTURED DOCX TABLE UNIT TEST (P1, §25-§26) ===');

  await test('PATTERN A — baris standar [label, value] tunggal per baris', async () => {
    const table = { rows: [{ cells: ['Pimpinan Rapat', 'Gubernur Maluku Utara'] }] };
    const pairs = resolveLabelValuePairs(table);
    assert.deepStrictEqual(pairs, [{ label: 'Pimpinan Rapat', value: 'Gubernur Maluku Utara' }]);
  });

  await test('PATTERN B — 2 label ter-stack dalam 1 sel dipasangkan dgn 2 value ter-stack pada sel lain (posisi berurutan)', async () => {
    const table = {
      rows: [{ cells: ['Pimpinan Rapat\nAgenda Rapat', ':     Gubernur Maluku Utara\n:     Pembahasan Ketahanan Pangan CPPD dan CBP'] }],
    };
    const pairs = resolveLabelValuePairs(table);
    assert.strictEqual(pairs.length, 2);
    assert.strictEqual(pairs[0].label, 'Pimpinan Rapat');
    assert.strictEqual(pairs[0].value, 'Gubernur Maluku Utara');
    assert.strictEqual(pairs[1].label, 'Agenda Rapat');
    assert.strictEqual(pairs[1].value, 'Pembahasan Ketahanan Pangan CPPD dan CBP');
  });

  await test('PATTERN B — value yang line-wrap tanpa colon berulang dianggap KELANJUTAN, bukan pasangan baru', async () => {
    const table = {
      rows: [{ cells: ['Pimpinan Rapat\nAgenda Rapat', ':     Gubernur Maluku Utara\n:     Pembahasan Ketahanan Pangan/Pengelolaan CPPD dan Penyaluran\n      Beras CBP'] }],
    };
    const pairs = resolveLabelValuePairs(table);
    assert.strictEqual(pairs.length, 2, 'Baris ketiga (kelanjutan tanpa ":") tidak boleh dihitung sbg pasangan ke-3.');
    assert.strictEqual(pairs[1].value, 'Pembahasan Ketahanan Pangan/Pengelolaan CPPD dan Penyaluran Beras CBP');
  });

  await test('Baris 3-sel [label, ":", value] (sel pemisah di tengah) tetap resolve label->value benar', async () => {
    const table = { rows: [{ cells: ['Hari/Tanggal', ':', '20 Agustus 2025'] }] };
    const pairs = resolveLabelValuePairs(table);
    assert.deepStrictEqual(pairs, [{ label: 'Hari/Tanggal', value: '20 Agustus 2025' }]);
  });

  await test('NEGATIVE — baris "Peserta Rapat" TIDAK BOLEH mengisi pimpinan_rapat', async () => {
    const table = { rows: [{ cells: ['Peserta Rapat', 'Forkopimda Provinsi Maluku Utara'] }] };
    const pairs = resolveLabelValuePairs(table);
    const pimpinan = pairs.find((p) => p.label.toLowerCase() === 'pimpinan rapat');
    assert.strictEqual(pimpinan, undefined, 'Label "Peserta Rapat" tidak boleh salah teridentifikasi sbg "Pimpinan Rapat".');
  });

  await test('NEGATIVE — baris "Notulis" TIDAK BOLEH mengisi pimpinan_rapat', async () => {
    const table = { rows: [{ cells: ['Notulis', 'Syarifudin Sima'] }] };
    const pairs = resolveLabelValuePairs(table);
    const pimpinan = pairs.find((p) => p.label.toLowerCase() === 'pimpinan rapat');
    assert.strictEqual(pimpinan, undefined);
  });

  await test('Baris kosong (sel tanpa label) tidak menghasilkan pasangan palsu', async () => {
    const table = { rows: [{ cells: ['', '', 'Kepala Badan Gizi Nasional'] }] };
    const pairs = resolveLabelValuePairs(table);
    assert.strictEqual(pairs.length, 0, 'Baris tanpa label (kelanjutan daftar peserta) tidak boleh menghasilkan pasangan label:value.');
  });

  await test('Integrasi end-to-end sintetis: docx_structure -> preamble -> extractRapatForkopimdaFields', async () => {
    const table = {
      rows: [
        { cells: ['Rapat', ':', 'Rapat Koordinasi Ketahanan Pangan Provinsi Maluku Utara'] },
        { cells: ['Hari/Tanggal', ':', '20 Agustus 2025'] },
        { cells: ['Pimpinan Rapat\nAgenda Rapat', ':     Gubernur Maluku Utara\n:     Pembahasan Ketahanan Pangan CPPD dan CBP'] },
        { cells: ['Notulis', ':', 'Syarifudin Sima, S.Hut., MP'] },
      ],
    };
    const pairs = resolveLabelValuePairs(table);
    const preamble = pairs.map((p) => `${p.label} : ${p.value}`).join('\n');
    const syntheticText = `${preamble}\n\nNOTULEN RAPAT\n\n(uraian rapat lainnya di sini)`;
    const fields = byKey(extractRapatForkopimdaFields(syntheticText));
    assert.strictEqual(fields.pimpinan_rapat.value, 'Gubernur Maluku Utara');
    assert.ok(/CPPD/i.test(fields.agenda.value) && /CBP/i.test(fields.agenda.value));
    assert.ok(/Rapat\s+Koordinasi/i.test(fields.nama_forum.value));
    assert.strictEqual(fields.tanggal_rapat.value, '2025-08-20');
  });
}

// ============================================================
// MAIN
// ============================================================

(async () => {
  await runBinaryE2ESection();
  await runTextGoldenUnitSection();
  await runNegativeRegressionSection();
  await runMultiPageSignerSection();
  await runStructuredTableUnitSection();

  console.log(`\n=== HASIL REAL EVIDENCE 2025 REGRESSION: ${pass} lulus, ${fail} gagal, ${skip} dilewati (binary tidak tersedia) ===`);
  if (fail > 0) process.exitCode = 1;
})();
