// backend/services/sdiDaftarDataExportPdfService.js
'use strict';

/**
 * Export Daftar Data Daerah ke PDF mengikuti Lampiran surat 000.7/4486/SETDA.
 *
 * Tabelnya 22 kolom, jauh melampaui lebar A4 landscape, sehingga halaman
 * disetel A3 landscape dengan huruf kecil. Kolom-kolom bertipe uraian panjang
 * (Definisi, Metode Pengumpulan) diberi lebar proporsional dan dipotong pada
 * batas yang wajar agar tabel tidak melar melewati satu halaman lebar.
 *
 * Baris nomor (1)-(22) diulang pada setiap halaman lewat <thead>, karena
 * nomor itulah yang dipakai Forum Satu Data sebagai rujukan verifikasi.
 */

const puppeteer = require('puppeteer');
const { KOLOM, LABEL_ENUM } = require('./sdiDaftarDataExportExcelService');

/** Lebar relatif tiap kolom pada cetakan; kolom uraian diberi porsi lebih besar. */
const LEBAR = {
  id_ddd: 2,
  id_ddp: 2.5,
  sumber_referensi: 7,
  kode_indikator: 4,
  nama_indikator: 7,
  nama_data: 7,
  jenis_data: 3,
  indikator_variabel: 3,
  kode_standar_data: 3.5,
  produsen_data: 4.5,
  klasifikasi_risiko: 3.5,
  definisi: 10,
  satuan: 2.5,
  klasifikasi_penyajian: 5,
  jadwal_pemutakhiran: 3.5,
  kategori_rad: 5,
  kode_metadata: 6,
  link_portal_daerah: 6,
  link_portal_sdi: 6,
  metode_pengumpulan: 8,
  periode_data: 3,
  penanggung_jawab: 4.5,
};

/** Batas panjang teks per sel supaya satu baris tabel tidak menelan satu halaman. */
const BATAS_TEKS = { definisi: 700, metode_pengumpulan: 700, sumber_referensi: 400 };

const escapeHtml = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function nilaiSel(row, key) {
  const mentah = row[key];

  // Sejalan dengan versi Excel: ID DDP kosong yang sudah dipastikan tidak
  // mengacu Data Pusat ditulis "-", bukan dibiarkan kosong.
  if (key === 'id_ddp' && (mentah == null || mentah === '')) {
    return row.id_ddp_status === 'tidak_mengacu' ? '-' : '';
  }
  if (mentah == null || mentah === '') return '';

  const teks = LABEL_ENUM[key]?.[mentah] || String(mentah);
  const batas = BATAS_TEKS[key];
  if (batas && teks.length > batas) {
    return `${teks.slice(0, teks.lastIndexOf(' ', batas) || batas)}...`;
  }
  return teks;
}

const tglIndo = (d = new Date()) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

function bangunHtml(rows, meta = {}) {
  const namaOpd = escapeHtml(meta.namaOpd || '-');
  const tahun = escapeHtml(meta.tahun || String(new Date().getFullYear()));
  const totalLebar = KOLOM.reduce((a, k) => a + (LEBAR[k.key] || 4), 0);

  const colgroup = KOLOM.map(
    (k) => `<col style="width:${(((LEBAR[k.key] || 4) / totalLebar) * 100).toFixed(2)}%">`,
  ).join('');

  const thHeader = KOLOM.map((k) => `<th>${escapeHtml(k.header)}</th>`).join('');
  const thNomor = KOLOM.map((k) => `<th class="nomor">(${k.no})</th>`).join('');

  const tbody = rows
    .map(
      (r) =>
        `<tr>${KOLOM.map((k) => {
          const isi = escapeHtml(nilaiSel(r, k.key));
          const kelas = ['id_ddd', 'id_ddp', 'satuan', 'jenis_data', 'indikator_variabel'].includes(
            k.key,
          )
            ? ' class="tengah"'
            : '';
          return `<td${kelas}>${isi}</td>`;
        }).join('')}</tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Daftar Data Daerah ${tahun}</title>
<style>
  @page { size: A3 landscape; margin: 10mm 8mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 7pt; color: #000; margin: 0; }
  .judul { text-align: center; margin-bottom: 2mm; }
  .judul h1 { font-size: 12pt; margin: 0 0 1mm; }
  .judul h2 { font-size: 10pt; font-weight: normal; margin: 0 0 2mm; }
  .identitas { font-size: 8pt; margin-bottom: 3mm; }
  .identitas div { margin-bottom: 0.5mm; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 0.4pt solid #333; padding: 1.2mm 1mm; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; }
  thead th { background: #1F4E79; color: #fff; font-size: 6.5pt; text-align: center; vertical-align: middle; }
  thead th.nomor { background: #F2F2F2; color: #000; font-size: 6pt; }
  td.tengah { text-align: center; }
  tbody tr:nth-child(even) { background: #FAFAFA; }
  /* Header tabel diulang tiap halaman agar nomor kolom selalu terbaca. */
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .kaki { margin-top: 3mm; font-size: 7pt; }
  .kaki ul { margin: 1mm 0 0; padding-left: 5mm; }
</style></head>
<body>
  <div class="judul">
    <h1>LAMPIRAN — FORMAT DAFTAR DATA DAERAH</h1>
    <h2>Penyelenggaraan Satu Data Indonesia</h2>
  </div>
  <div class="identitas">
    <div><strong>Nama OPD</strong> : ${namaOpd}</div>
    <div><strong>Tahun</strong> : ${tahun}</div>
    <div><strong>Jumlah Data</strong> : ${rows.length} data</div>
  </div>
  <table>
    <colgroup>${colgroup}</colgroup>
    <thead><tr>${thHeader}</tr><tr>${thNomor}</tr></thead>
    <tbody>${tbody || `<tr><td colspan="${KOLOM.length}">Belum ada data.</td></tr>`}</tbody>
  </table>
  <div class="kaki">
    <strong>Catatan:</strong>
    <ul>
      <li>Atribut nomor (1) sampai dengan (16) merupakan atribut Daftar Data Daerah yang disusun pada tahap Perencanaan data.</li>
      <li>Atribut nomor (17), (18), dan (19) ditambahkan untuk keperluan evaluasi kelengkapan metadata (tahap Pemeriksaan) dan kelengkapan link portal (tahap Penyebarluasan).</li>
      <li>Atribut nomor (20) sampai dengan (22) merupakan tambahan pemenuh metadata Standar Data Indonesia sesuai ketentuan angka 4 surat Nomor 000.7/4486/SETDA.</li>
      <li>Kolom ID DDP bertanda "-" berarti data tidak mengacu ke Daftar Data Pusat/Data Prioritas.</li>
    </ul>
    <div style="margin-top:2mm">Dicetak dari e-PeLARA pada ${tglIndo()}.</div>
  </div>
</body></html>`;
}

/**
 * @param {object} res  Express response
 * @param {Array}  rows Baris Daftar Data
 * @param {object} meta { namaOpd, tahun }
 */
async function exportDaftarDataPdf(res, rows, meta = {}) {
  const html = bangunHtml(rows, meta);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdf = await page.pdf({
      format: 'A3',
      landscape: true,
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '8mm', right: '8mm' },
    });

    const namaFile = `Daftar-Data-Daerah-${String(meta.namaOpd || 'OPD').replace(/[^\w]+/g, '-')}-${meta.tahun || ''}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${namaFile}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.end(pdf);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { exportDaftarDataPdf, bangunHtml };
