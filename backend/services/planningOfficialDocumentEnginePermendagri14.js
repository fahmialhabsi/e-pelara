'use strict';

/**
 * Mesin dokumen resmi Renja Perangkat Daerah — sistematika Permendagri 14/2026
 * (6 bab + Tabel 4.1 landscape 17 kolom).
 *
 * Terpisah dari planningOfficialDocumentEngine.js yang melayani Permendagri
 * 86/2017 dan RKPD. Pemilihannya dilakukan di berkas tersebut berdasarkan
 * kolom renja_dokumen.regulasi_acuan.
 *
 * Helper tata letak, tabel markdown, dan kepala dokumen dipakai ulang apa
 * adanya; yang benar-benar baru hanya Tabel 4.1 karena susunan kolom dan
 * kepala tabelnya berbeda sama sekali dari versi 86/2017.
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  TableLayoutType,
  PageBreak,
  PageNumber,
  Footer,
  TableOfContents,
  HeadingLevel,
  ImageRun,
  ShadingType,
  HeightRule,
  VerticalAlign,
  SequentialIdentifier,
} = require('docx');

const {
  addPortrait,
  addLandscape,
  nextPortrait,
  usableWidth,
  leftMargin,
  topMargin,
} = require('../helpers/RenjaPdfLayoutHelper');
const { drawPdfGridTable, renderMarkdownToPdf } = require('../helpers/RenjaPdfTableHelper');
const { PDF_THEME } = require('../helpers/RenjaPdfThemeHelper');
const {
  lebarKolom,
  lebarKolomPersen,
  kepalaTabel,
  barisTabel,
  selBaris,
  barisPenomoran,
  BARIS_TEBAL,
} = require('../helpers/Permendagri14Bab4TableHelper');
const { generateBabPermendagri14 } = require('./permendagri14/renjaBabGeneratorService');
const { recalcDpaRealisasi } = require('./dpaRealisasiRollupService');
const { recalcLkDispang } = require('./lkDispangRollupService');

/** Penanda tempat Tabel 4.1 disisipkan di dalam narasi Bab IV. */
const PENANDA_TABEL = '[TABEL_4_1]';

const JUDUL_BAB = [
  ['bab1', 'BAB I — PENDAHULUAN'],
  ['bab2', 'BAB II — HASIL EVALUASI RENJA PERANGKAT DAERAH TAHUN LALU'],
  ['bab3', 'BAB III — TUJUAN DAN SASARAN PERANGKAT DAERAH'],
  ['bab4', 'BAB IV — RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH'],
  ['bab5', 'BAB V — KINERJA PENYELENGGARAAN BIDANG URUSAN'],
  ['bab6', 'BAB VI — PENUTUP'],
];

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** Palet warna cover — hijau tema Ketahanan Pangan + aksen emas instansional. */
const WARNA_COVER = {
  HIJAU_TUA: '#14532D',
  HIJAU_SEDANG: '#1B7A3E',
  HIJAU_MUDA: '#4CA658',
  EMAS: '#E8C170',
  PUTIH: '#FFFFFF',
};

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'branding', 'logo-maluku-utara.jpeg');
let LOGO_BUFFER = null;
try {
  LOGO_BUFFER = fs.readFileSync(LOGO_PATH);
} catch {
  LOGO_BUFFER = null;
}

/** Sampul jadi (desain siap pakai dari tim, bukan digambar ulang) — dipakai
 * penuh 1 halaman A4; jatuh balik ke sampul vektor kalau berkasnya tidak ada. */
const COVER_IMAGE_PATH = path.join(
  __dirname,
  '..',
  'assets',
  'branding',
  'cover-renja-dinas-pangan-2027.png',
);
let COVER_IMAGE_BUFFER = null;
try {
  COVER_IMAGE_BUFFER = fs.readFileSync(COVER_IMAGE_PATH);
} catch {
  COVER_IMAGE_BUFFER = null;
}

/** Baca lebar/tinggi PNG langsung dari chunk IHDR (offset tetap 16/20), tanpa
 * dependensi paket luar — cukup untuk kebutuhan hitung rasio gambar sampul. */
function dimensiPng(buffer) {
  if (!buffer || buffer.length < 24) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const COVER_IMAGE_DIM = dimensiPng(COVER_IMAGE_BUFFER);

/** Halaman potret isi dokumen dibuat POLOS (tanpa banner/lencana/garis hias
 * header-footer) — sudah dicoba banner ilustrasi penuh (memakan ±42% tinggi
 * halaman, bikin dokumen 59→70 halaman) lalu versi ringkas lencana+garis
 * aksen, tapi user tetap minta polos. Margin kembali ke 40pt standar semua
 * sisi, sama seperti modul 86/2017. Nomor halaman tetap ada lewat
 * stempelNomorHalaman() di akhir proses render. */
function nextPortraitBerpita(pdf) {
  nextPortrait(pdf);
}

/** Jarak antar baris paragraf (opsional) — dipakai supaya modul 14/2026 bisa
 * pakai spacing lebih longgar tanpa mengubah renderMarkdownToPdf bagi modul
 * 86/2017 yang memanggilnya tanpa opts (default tetap seperti sebelumnya). */
const PDF_LINE_GAP = 3.5;
const DOCX_LINE_SPACING = 360; // 1,5x (satuan 240/baris)

/** Header tabel modul ini pakai hijau tema pangan (bukan biru pucat bawaan
 * PDF_THEME, yang tetap dipertahankan apa adanya untuk modul 86/2017). */
const HEADER_TABEL_PDF = { headerFill: WARNA_COVER.HIJAU_SEDANG, headerText: '#FFFFFF' };
const HEADER_TABEL_DOCX = '1B7A3E';

/** Pola baris judul subbab ("2.1 ...") dan judul tabel ("Tabel 2.1 ..."), dipakai
 * bersama oleh pelacak halaman PDF (Daftar Isi/Daftar Tabel) dan render DOCX
 * (heading level 2 / caption Word) supaya kedua format konsisten. */
const SUBBAB_REGEX = /^\d+\.\d+\s+\S/;
const TABEL_CAPTION_REGEX = /^Tabel\s+\d+\.\d+\s+\S/;

/** Tabel 2.4 (11 kolom, T-C.29) & Tabel 2.5 (14 kolom, SPM/Pelayanan) terlalu
 * padat di potret — kolomnya jadi sangat sempit dan header terpecah tidak
 * karuan; keduanya dirender di halaman landscape lewat
 * renderBabTerlacak({ landscapeUntukTabel }). Nomornya mengikuti penomoran di
 * renjaBabGeneratorService.js — kalau tabel Bab II ditambah/dikurangi lagi,
 * regex ini WAJIB disesuaikan ulang. */
const TABEL_LEBAR_BAB2 = /^Tabel 2\.[45]\b/;

function formatBulanTahun(tanggal) {
  const d = tanggal instanceof Date ? tanggal : new Date(tanggal);
  if (Number.isNaN(d.getTime())) return '';
  return `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Ambil pejabat penandatangan (Kepala Dinas) untuk Kata Pengantar. Mundur ke
 * tahun sebelumnya jika data tahun berjalan belum diisi (mis. dokumen Renja
 * tahun mendatang dibuat sebelum data pejabat tahun itu di-input).
 */
async function ambilPejabatKepalaDinas(db, tahun) {
  const { PejabatPenandatangan } = db;
  if (!PejabatPenandatangan) return null;
  for (const t of [Number(tahun), Number(tahun) - 1, Number(tahun) - 2]) {
    const row = await PejabatPenandatangan.findOne({ where: { tahun: t, role: 'KEPALA_DINAS' } });
    if (row && row.nama && row.nama !== '-') return row;
  }
  return null;
}

/** Data blok tanda tangan (Kata Pengantar & Bab VI Penutup) — satu sumber
 * dipakai bersama supaya formatnya identik di kedua tempat dan kedua format. */
function dataTandaTangan(pejabat, meta, dok) {
  const namaPejabat =
    pejabat?.nama && pejabat.nama !== '-'
      ? pejabat.nama
      : '[Belum diisi — lengkapi di menu Setting Pejabat Penandatangan]';
  const nipPejabat = pejabat?.nip && pejabat.nip !== '-' ? pejabat.nip : '.....................';
  const namaOpdSingkat = String(meta.pdNama || '')
    .replace(/\s*Provinsi Maluku Utara$/i, '')
    .trim();
  const jabatanSingkat = `Kepala ${namaOpdSingkat}`;
  const bulanTahun = formatBulanTahun(dok.tanggal_pengesahan || new Date());
  return { namaPejabat, nipPejabat, jabatanSingkat, bulanTahun };
}

/** Blok tanda tangan versi PDF — dipanggil di Kata Pengantar dan Bab VI Penutup. */
function renderTandaTanganPdf(pdf, pejabat, meta, dok) {
  const { namaPejabat, nipPejabat, jabatanSingkat, bulanTahun } = dataTandaTangan(pejabat, meta, dok);
  pdf.font('Helvetica').fontSize(10).fillColor('#000000');
  pdf.text(`Sofifi, ${bulanTahun}`, { align: 'right' });
  pdf.text(`${jabatanSingkat},`, { align: 'right' });
  pdf.moveDown(3);
  pdf.font('Helvetica-Bold').text(namaPejabat, { align: 'right' });
  pdf.font('Helvetica').text(`NIP. ${nipPejabat}`, { align: 'right' });
}

/** Blok tanda tangan versi DOCX — dipanggil di Kata Pengantar dan Bab VI Penutup. */
function tandaTanganParagraphsDocx(pejabat, meta, dok) {
  const { namaPejabat, nipPejabat, jabatanSingkat, bulanTahun } = dataTandaTangan(pejabat, meta, dok);
  return [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 400 },
      children: [new TextRun({ text: `Sofifi, ${bulanTahun}`, size: 20, font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 1200 },
      children: [new TextRun({ text: `${jabatanSingkat},`, size: 20, font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: namaPejabat, bold: true, size: 20, font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `NIP. ${nipPejabat}`, size: 20, font: 'Arial' })],
    }),
  ];
}

/** Paragraf isi Kata Pengantar, dipakai bersama oleh render PDF & DOCX. */
function paragrafKataPengantar(meta, dok) {
  return [
    `Puji dan syukur kami panjatkan kehadirat Tuhan Yang Maha Esa, karena atas rahmat dan karunia-Nya, ${meta.pdNama} dapat menyelesaikan penyusunan Rencana Kerja (Renja) Tahun ${dok.tahun}.`,
    `Renja ini disusun sebagai dokumen perencanaan tahunan Perangkat Daerah yang memuat program, kegiatan, indikator kinerja, target, dan pagu indikatif, berpedoman pada Peraturan Menteri Dalam Negeri Nomor 14 Tahun 2026 tentang Pedoman Penyusunan Rencana Kerja Pemerintah Daerah, serta mengacu pada Rencana Kerja Pembangunan Daerah (RKPD) dan Rencana Strategis (Renstra) ${meta.pdNama} Tahun ${meta.periodeStr}.`,
    `Ketahanan pangan merupakan salah satu urusan strategis yang menjadi perhatian utama Pemerintah Provinsi Maluku Utara, mengingat keterkaitannya yang erat dengan stabilitas harga, daya beli masyarakat, dan kesejahteraan sosial. Berbagai upaya pengendalian inflasi daerah, termasuk pelaksanaan Gerakan Pangan Murah (GPM) di berbagai kabupaten/kota, terus diperkuat sebagai wujud kehadiran pemerintah daerah dalam menjaga ketersediaan dan keterjangkauan pangan bagi masyarakat.`,
    `Rencana Kerja Tahun ${dok.tahun} ini disusun dengan memperhatikan hasil evaluasi pelaksanaan tahun-tahun sebelumnya, dinamika kesepakatan Rapat Koordinasi Teknis Perencanaan Pembangunan (Rakortekbang) Tahun 2026, serta aspirasi pemangku kepentingan, sehingga program dan kegiatan yang direncanakan benar-benar responsif terhadap kebutuhan penguatan ketahanan pangan daerah sekaligus selaras dengan prioritas pembangunan nasional.`,
    `Penyusunan dokumen ini merupakan hasil kerja sama dan koordinasi seluruh bidang dan unit kerja di lingkungan ${meta.pdNama}, dengan dukungan data dari Badan Perencanaan Pembangunan Daerah, Dewan Perwakilan Rakyat Daerah, serta instansi vertikal terkait. Kami menyampaikan penghargaan dan ucapan terima kasih atas kontribusi seluruh pihak dalam proses penyusunannya.`,
    'Kami menyadari bahwa dokumen ini masih memerlukan penyempurnaan. Oleh karena itu, kritik dan saran yang membangun sangat kami harapkan demi perbaikan pada penyusunan dokumen perencanaan berikutnya.',
    `Demikian Rencana Kerja ini disusun, semoga dapat menjadi acuan dalam pelaksanaan program dan kegiatan pembangunan Tahun ${dok.tahun}, serta memberikan kontribusi nyata bagi terwujudnya ketahanan pangan Provinsi Maluku Utara yang mandiri dan berkelanjutan.`,
  ];
}

// ---------------------------------------------------------------------------
// Konteks
// ---------------------------------------------------------------------------

/**
 * Bangun ulang narasi 6 bab tepat sebelum dokumen dicetak, setelah realisasi
 * dari DPA/LK disegarkan. Dengan begitu berkas yang diunduh selalu memuat
 * angka terbaru tanpa pengguna harus menekan Recall lebih dulu.
 */
async function muatKonteks(db, dokumenId) {
  const { RenjaDokumen, PerangkatDaerah, PeriodeRpjmd } = db;

  const dok = await RenjaDokumen.findByPk(dokumenId, {
    include: [
      { model: PerangkatDaerah, as: 'perangkatDaerah', required: false },
      { model: PeriodeRpjmd, as: 'periode', required: false },
    ],
  });
  if (!dok) throw new Error('renja_dokumen tidak ditemukan');

  try {
    const tahunRealisasi = Number(dok.tahun) - 2;
    await recalcDpaRealisasi(db, tahunRealisasi);
    await recalcLkDispang(db, tahunRealisasi);
  } catch (e) {
    console.warn('[Permendagri14] Recalc realisasi gagal:', e?.message || e);
  }

  const bab = await generateBabPermendagri14(db, dokumenId);
  const pdNama = dok.perangkatDaerah?.nama || `PD #${dok.perangkat_daerah_id}`;

  return {
    dok,
    bab,
    tabel41: bab.tabel41,
    meta: {
      pdNama,
      tahun: dok.tahun,
      periodeStr: dok.periode ? `${dok.periode.tahun_awal}–${dok.periode.tahun_akhir}` : '—',
      judulResmi: `RENCANA KERJA (RENJA)\n${pdNama.toUpperCase()}\nTAHUN ${dok.tahun}`,
    },
  };
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

const TEPI_TIPIS = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
};

function selDocx(teks, opsi = {}) {
  const { tebal = false, lebar = null, colSpan = 1, rowSpan = 1, align, headerHijau = false } = opsi;
  return new TableCell({
    borders: TEPI_TIPIS,
    columnSpan: colSpan,
    rowSpan,
    ...(lebar ? { width: { size: lebar, type: WidthType.PERCENTAGE } } : {}),
    ...(headerHijau ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: HEADER_TABEL_DOCX } } : {}),
    children: [
      new Paragraph({
        alignment: align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text: String(teks ?? ''),
            bold: tebal,
            size: 12,
            font: 'Arial',
            color: headerHijau ? 'FFFFFF' : undefined,
          }),
        ],
      }),
    ],
  });
}

/** Tabel 4.1 versi DOCX, kepala 3 tingkat memakai columnSpan/rowSpan bawaan docx. */
function tabel41Docx(tabel41) {
  const persen = lebarKolomPersen();
  const kepala = kepalaTabel(tabel41?.meta);

  const barisKepala = kepala.map(
    (baris) =>
      new TableRow({
        tableHeader: true,
        children: baris
          .filter((sel) => sel !== null)
          .map((sel) =>
            selDocx(sel.text, {
              tebal: true,
              align: 'center',
              colSpan: sel.colSpan || 1,
              rowSpan: sel.rowSpan || 1,
              headerHijau: true,
            }),
          ),
      }),
  );

  const barisNomor = new TableRow({
    children: barisPenomoran().map((t, i) => selDocx(t, { align: 'center', lebar: persen[i] })),
  });

  const barisIsi = (tabel41?.baris || []).map((b) => {
    const sel = selBaris(b);
    const tebal = BARIS_TEBAL.has(b.jenis);
    return new TableRow({
      children: sel.map((t, i) => selDocx(t, { tebal, lebar: persen[i] })),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [...barisKepala, barisNomor, ...barisIsi],
  });
}

function judul(teks, ukuran = 24, opsi = {}) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: !!opsi.halamanBaru,
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: teks, bold: true, size: ukuran, font: 'Arial' })],
  });
}

/** Ubah teks bab (markdown sederhana) menjadi paragraf & tabel DOCX. */
function isiBabDocx(teksBab) {
  const anak = [];
  const baris = String(teksBab || '').split(/\r?\n/);
  let bufferTabel = [];

  const bilasTabel = () => {
    if (bufferTabel.length < 2) {
      bufferTabel.forEach((l) =>
        anak.push(new Paragraph({ children: [new TextRun({ text: l, size: 20, font: 'Arial' })] })),
      );
      bufferTabel = [];
      return;
    }
    const pecah = (l) =>
      l
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim().replace(/\*\*/g, ''));
    const isiBaris = bufferTabel.filter((l) => !/^\|[-:\s|]+\|$/.test(l.trim()));
    const kepala = pecah(isiBaris[0]);
    const rows = [
      new TableRow({
        tableHeader: true,
        children: kepala.map((t) => selDocx(t, { tebal: true, align: 'center', headerHijau: true })),
      }),
      ...isiBaris.slice(1).map(
        (l) =>
          new TableRow({
            children: pecah(l)
              .slice(0, kepala.length)
              .map((t) => selDocx(t)),
          }),
      ),
    ];
    anak.push(
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
      new Paragraph({ text: '' }),
    );
    bufferTabel = [];
  };

  for (const l of baris) {
    if (l.trim().startsWith('|')) {
      bufferTabel.push(l);
      continue;
    }
    if (bufferTabel.length) bilasTabel();
    if (!l.trim()) {
      anak.push(new Paragraph({ text: '' }));
      continue;
    }
    // Judul subbab "2.1 ..." — heading level 2 supaya ikut Daftar Isi Word.
    const subbab = SUBBAB_REGEX.test(l.trim());
    // Judul tabel "Tabel 2.1 ..." — pakai field SEQ Word supaya bisa ditarik
    // Daftar Tabel (TOC captionLabel:'Tabel') sekaligus bernomor otomatis.
    const cocokTabel = l.trim().match(TABEL_CAPTION_REGEX);
    if (cocokTabel) {
      const sisaJudul = l.trim().replace(/^Tabel\s+\d+\.\d+\s*/, '');
      anak.push(
        new Paragraph({
          style: 'Caption',
          spacing: { before: 200, after: 80, line: DOCX_LINE_SPACING },
          children: [
            new TextRun({ text: 'Tabel ', bold: true, size: 20, font: 'Arial' }),
            new SequentialIdentifier('Tabel'),
            new TextRun({ text: ` ${sisaJudul}`, bold: true, size: 20, font: 'Arial' }),
          ],
        }),
      );
      continue;
    }
    // Daftar bernomor "1. Teks..." — indent menjorok supaya baris lanjutan
    // sejajar teks (bukan balik ke margin), meniru gaya dokumen resmi.
    const cocokBernomor = l.trim().match(/^(\d+\.)\s+(\S.*)$/);
    if (cocokBernomor) {
      anak.push(
        new Paragraph({
          spacing: { line: DOCX_LINE_SPACING, after: 60 },
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 380, hanging: 380 },
          children: [new TextRun({ text: l.trim(), size: 20, font: 'Arial' })],
        }),
      );
      continue;
    }
    anak.push(
      new Paragraph({
        heading: subbab ? HeadingLevel.HEADING_2 : undefined,
        spacing: subbab ? { before: 200, after: 100 } : { line: DOCX_LINE_SPACING },
        alignment: subbab ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: l, bold: subbab, size: 20, font: 'Arial' })],
      }),
    );
  }
  if (bufferTabel.length) bilasTabel();
  return anak;
}

/** Paragraf rata tengah putih di atas latar hijau — dipakai berulang pada cover DOCX. */
function baris(teks, opsi = {}) {
  const { tebal = false, ukuran = 24, warna = 'FFFFFF', italic = false, spasi = {} } = opsi;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: spasi,
    children: [
      new TextRun({ text: teks, bold: tebal, italics: italic, size: ukuran, color: warna, font: 'Arial' }),
    ],
  });
}

/** Sampul dari berkas gambar siap pakai — 1 paragraf gambar pas ke halaman A4
 * (794x1123 px ~ 96dpi) tanpa menggepengkan, diletakkan di section tersendiri
 * bermargin 0. Rasio dihitung dari berkas asli, bukan diasumsikan persis A4. */
function halamanCoverGambarDocx() {
  const HAL_W = 794;
  const HAL_H = 1123;
  let w = HAL_W;
  let h = HAL_H;
  if (COVER_IMAGE_DIM?.width && COVER_IMAGE_DIM?.height) {
    const rasio = COVER_IMAGE_DIM.width / COVER_IMAGE_DIM.height;
    h = Math.round(HAL_W / rasio);
    if (h > HAL_H) {
      h = HAL_H;
      w = Math.round(HAL_H * rasio);
    }
  }
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new ImageRun({ data: COVER_IMAGE_BUFFER, transformation: { width: w, height: h } })],
    }),
  ];
}

/** Halaman sampul (Cover) hijau tema Ketahanan Pangan — sel tabel penuh 1 halaman, tanpa nomor halaman. */
function halamanCoverVektorDocx(meta, dok) {
  const pd = String(meta.pdNama || '')
    .replace(/\s*Provinsi Maluku Utara$/i, '')
    .toUpperCase();

  const isi = [
    baris('', { spasi: { before: 200 } }),
    ...(LOGO_BUFFER
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ data: LOGO_BUFFER, transformation: { width: 80, height: 80 } })],
          }),
        ]
      : []),
    baris('PEMERINTAH PROVINSI MALUKU UTARA', { tebal: true, ukuran: 26, spasi: { before: 300, after: 500 } }),
    baris('RENCANA KERJA (RENJA)', { tebal: true, ukuran: 40, spasi: { before: 400 } }),
    baris(pd, { tebal: true, ukuran: 30, warna: 'E8C170' }),
    baris(`TAHUN ${dok.tahun}`, { tebal: true, ukuran: 28, spasi: { after: 500 } }),
    baris('Mewujudkan Ketahanan Pangan Maluku Utara yang Mandiri dan Berkelanjutan', {
      italic: true,
      ukuran: 20,
      warna: 'E8C170',
    }),
  ];

  const selCover = new TableCell({
    width: { size: 100, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '14532D' },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    children: isi,
  });

  const tabelCover = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        height: { value: 15000, rule: HeightRule.ATLEAST },
        children: [selCover],
      }),
    ],
  });

  return [tabelCover];
}

/** Dipakai gambar jadi kalau tersedia; kalau tidak, jatuh balik ke sampul vektor. */
function halamanCoverDocx(meta, dok) {
  return COVER_IMAGE_BUFFER ? halamanCoverGambarDocx() : halamanCoverVektorDocx(meta, dok);
}

/** Halaman Kata Pengantar, memuat blok tanda tangan Kepala Dinas. */
async function halamanKataPengantarDocx(db, meta, dok, pejabat) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: 'KATA PENGANTAR', bold: true, size: 28, font: 'Arial' })],
    }),
    ...paragrafKataPengantar(meta, dok).map(
      (p) =>
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: DOCX_LINE_SPACING },
          children: [new TextRun({ text: p, size: 20, font: 'Arial' })],
        }),
    ),
    ...tandaTanganParagraphsDocx(pejabat, meta, dok),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

/** Halaman Daftar Isi — memakai field TOC bawaan Word (perbarui via klik-kanan > Update Field). */
function halamanDaftarIsiDocx() {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: 'DAFTAR ISI', bold: true, size: 28, font: 'Arial' })],
    }),
    new TableOfContents('Daftar Isi', { hyperlink: true, headingStyleRange: '1-2' }),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: 'DAFTAR TABEL', bold: true, size: 28, font: 'Arial' })],
    }),
    new TableOfContents('Daftar Tabel', { hyperlink: true, captionLabel: 'Tabel' }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

async function buildRenjaPermendagri14Docx(db, dokumenId, options = {}) {
  const { dok, bab, tabel41, meta } = await muatKonteks(db, dokumenId);
  const versi = options.documentVersion != null ? options.documentVersion : dok.versi;
  const pejabat = await ambilPejabatKepalaDinas(db, dok.tahun);

  const halamanCover = halamanCoverDocx(meta, dok, versi);
  const halamanKataPengantar = await halamanKataPengantarDocx(db, meta, dok, pejabat);
  const halamanDaftarIsi = halamanDaftarIsiDocx();

  // Bab I-III dan V-VI potret; Bab IV dipecah agar tabelnya masuk bagian landscape.
  // Bab I tidak perlu page-break sendiri (sudah dapat halaman baru dari Daftar
  // Isi), tapi Bab II & III WAJIB — tanpa ini keduanya bisa nyambung ke Bab
  // sebelumnya di halaman yang sama kalau isi Bab sebelumnya pas-pasan.
  const bagianPotretAwal = [];
  JUDUL_BAB.slice(0, 3).forEach(([kunci, teksJudul], idx) => {
    bagianPotretAwal.push(judul(teksJudul, 24, { halamanBaru: idx > 0 }), ...isiBabDocx(bab[kunci]));
  });

  const [sebelumTabel, sesudahTabel] = String(bab.bab4 || '').split(PENANDA_TABEL);
  const bagianLandscape = [
    judul('BAB IV — RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH'),
    ...isiBabDocx(sebelumTabel),
    tabel41Docx(tabel41),
    new Paragraph({ text: '' }),
    ...isiBabDocx(sesudahTabel || ''),
  ];

  // Bab V tidak perlu page-break sendiri (section landscape->potret sebelumnya
  // sudah otomatis pindah halaman), tapi Bab VI WAJIB.
  const bagianPotretAkhir = [];
  JUDUL_BAB.slice(4).forEach(([kunci, teksJudul], idx) => {
    bagianPotretAkhir.push(judul(teksJudul, 24, { halamanBaru: idx > 0 }), ...isiBabDocx(bab[kunci]));
    if (kunci === 'bab6') {
      bagianPotretAkhir.push(...tandaTanganParagraphsDocx(pejabat, meta, dok));
    }
  });

  const footerNomor = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial' })],
      }),
    ],
  });

  const doc = new Document({
    creator: 'ePelara',
    title: `Renja ${meta.pdNama} Tahun ${dok.tahun}`,
    description: 'Dokumen resmi Renja Perangkat Daerah — Permendagri 14/2026',
    sections: [
      {
        // Sampul: section tersendiri bermargin 0 (gambar tampil penuh tepi
        // halaman) dan tanpa footer — tidak ikut dihitung nomor halaman.
        properties: { page: { margin: { top: 0, right: 0, bottom: 0, left: 0 } } },
        children: halamanCover,
      },
      {
        // Kata Pengantar mulai dari halaman 1 (penomoran di-reset, sampul tak dihitung).
        properties: { page: { pageNumbers: { start: 1 } } },
        footers: { default: footerNomor },
        children: [...halamanKataPengantar, ...halamanDaftarIsi, ...bagianPotretAwal],
      },
      {
        properties: { page: { size: { orientation: 'landscape' } } },
        footers: { default: footerNomor },
        children: bagianLandscape,
      },
      { properties: {}, footers: { default: footerNomor }, children: bagianPotretAkhir },
    ],
  });

  return Packer.toBuffer(doc);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/** Motif dekoratif "bulir padi" sederhana — beberapa elips di sepanjang batang lengkung. */
function gambarBulirPadi(pdf, x, y, tinggi, warna, cermin = false) {
  const arah = cermin ? -1 : 1;
  pdf.save();
  pdf.lineWidth(1.4).strokeColor(warna);
  pdf.moveTo(x, y).bezierCurveTo(x + arah * 18, y - tinggi * 0.4, x - arah * 6, y - tinggi * 0.75, x + arah * 4, y - tinggi).stroke();
  const jumlahBulir = 6;
  for (let i = 1; i <= jumlahBulir; i += 1) {
    const t = i / (jumlahBulir + 1);
    const bx = x + arah * (18 * t * 0.9);
    const by = y - tinggi * t;
    pdf.save();
    pdf.fillColor(warna);
    pdf.ellipse(bx + arah * 7, by - 2, 5, 3).fill();
    pdf.restore();
  }
  pdf.restore();
}

/** Sampul jadi dari berkas gambar siap pakai — pas ke 1 halaman A4 tanpa
 * menggepengkan gambar (rasio berkas belum tentu persis rasio A4). */
function renderCoverGambarPdf(pdf) {
  pdf.image(COVER_IMAGE_BUFFER, 0, 0, {
    fit: [pdf.page.width, pdf.page.height],
    align: 'center',
    valign: 'center',
  });
}

/** Halaman sampul (Cover), pakai berkas gambar jadi kalau tersedia; kalau tidak,
 * jatuh balik ke sampul vektor hijau tema Ketahanan Pangan. Tidak diberi nomor halaman. */
function renderCoverPdf(pdf, meta, dok) {
  if (COVER_IMAGE_BUFFER) {
    renderCoverGambarPdf(pdf);
    return;
  }
  renderCoverVektorPdf(pdf, meta, dok);
}

function renderCoverVektorPdf(pdf, meta, dok) {
  const pd = String(meta.pdNama || '')
    .replace(/\s*Provinsi Maluku Utara$/i, '')
    .toUpperCase();
  const lebar = pdf.page.width;
  const tinggi = pdf.page.height;

  // --- Latar gradien hijau, dari tua (atas) ke sedang (bawah) ---
  const gradien = pdf.linearGradient(0, 0, 0, tinggi);
  gradien.stop(0, WARNA_COVER.HIJAU_TUA).stop(1, WARNA_COVER.HIJAU_SEDANG);
  pdf.rect(0, 0, lebar, tinggi).fill(gradien);

  // --- Pita aksen emas atas & bawah ---
  pdf.rect(0, 0, lebar, 8).fill(WARNA_COVER.EMAS);
  pdf.rect(0, tinggi - 8, lebar, 8).fill(WARNA_COVER.EMAS);

  // --- Gelombang dekoratif hijau muda di sepertiga bawah ---
  pdf.save();
  pdf.fillColor(WARNA_COVER.HIJAU_MUDA).opacity(0.55);
  pdf
    .moveTo(0, tinggi * 0.62)
    .bezierCurveTo(lebar * 0.28, tinggi * 0.56, lebar * 0.68, tinggi * 0.7, lebar, tinggi * 0.6)
    .lineTo(lebar, tinggi)
    .lineTo(0, tinggi)
    .closePath()
    .fill();
  pdf.restore();
  pdf.opacity(1);

  // --- Lencana putih berisi lambang Provinsi Maluku Utara ---
  const pusatX = lebar / 2;
  const pusatYLogo = 118;
  const radius = 46;
  pdf.save();
  pdf.fillColor(WARNA_COVER.PUTIH);
  pdf.circle(pusatX, pusatYLogo, radius).fill();
  pdf.restore();
  if (LOGO_BUFFER) {
    const sisi = radius * 1.5;
    pdf.image(LOGO_BUFFER, pusatX - sisi / 2, pusatYLogo - sisi / 2, {
      fit: [sisi, sisi],
      align: 'center',
      valign: 'center',
    });
  }

  // --- Motif bulir padi kiri & kanan bawah ---
  gambarBulirPadi(pdf, 70, tinggi - 50, 90, WARNA_COVER.EMAS, false);
  gambarBulirPadi(pdf, lebar - 70, tinggi - 50, 90, WARNA_COVER.EMAS, true);

  // --- Teks kop instansi ---
  let y = pusatYLogo + radius + 22;
  pdf.fillColor(WARNA_COVER.PUTIH).font('Helvetica-Bold').fontSize(14);
  pdf.text('PEMERINTAH PROVINSI MALUKU UTARA', 0, y, { align: 'center', width: lebar });

  // --- Blok judul utama ---
  y += 70;
  pdf.fillColor(WARNA_COVER.PUTIH).font('Helvetica-Bold').fontSize(26);
  pdf.text('RENCANA KERJA (RENJA)', 0, y, { align: 'center', width: lebar });
  y += 38;
  pdf.fillColor(WARNA_COVER.EMAS).font('Helvetica-Bold').fontSize(20);
  pdf.text(pd, 0, y, { align: 'center', width: lebar });
  y += 32;
  pdf.fillColor(WARNA_COVER.PUTIH).font('Helvetica-Bold').fontSize(18);
  pdf.text(`TAHUN ${dok.tahun}`, 0, y, { align: 'center', width: lebar });

  // --- Frasa tematik pangan ---
  y += 46;
  pdf.fillColor(WARNA_COVER.EMAS).font('Helvetica-Oblique').fontSize(11);
  pdf.text('Mewujudkan Ketahanan Pangan Maluku Utara yang Mandiri dan Berkelanjutan', 40, y, {
    align: 'center',
    width: lebar - 80,
  });

  pdf.fillColor('#000000');
}

/** Halaman Kata Pengantar, memuat blok tanda tangan Kepala Dinas. */
function renderKataPengantarPdf(pdf, pejabat, meta, dok) {
  pdf.font('Helvetica-Bold').fontSize(14).fillColor('#000000');
  pdf.text('KATA PENGANTAR', { align: 'center' });
  pdf.moveDown(0.8);

  pdf.font('Helvetica').fontSize(10);
  for (const p of paragrafKataPengantar(meta, dok)) {
    pdf.text(p, { align: 'justify', lineGap: PDF_LINE_GAP });
    pdf.moveDown(0.5);
  }

  pdf.moveDown(0.6);
  renderTandaTanganPdf(pdf, pejabat, meta, dok);
}

/** Nomor halaman cetak: sampul (indeks 0) tidak dihitung sama sekali — Kata
 * Pengantar menjadi halaman 1, sesuai konvensi dokumen resmi. */
function labelHalaman(pdf) {
  return pdf.bufferedPageRange().count - 1;
}

/** Cetak nomor halaman di semua halaman terbuffer, kecuali sampul (halaman 0). */
function stempelNomorHalaman(pdf) {
  const range = pdf.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    if (i === 0) continue; // sampul tidak diberi nomor
    pdf.switchToPage(i);
    // Jarak tetap dari tepi bawah fisik (bukan dari margins.bottom) — supaya
    // konsisten di halaman potret maupun landscape (Tabel 4.1), yang
    // margin-nya sama-sama 40pt standar (halaman polos, tanpa hiasan).
    const y = pdf.page.height - 28;
    pdf
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(WARNA_COVER.HIJAU_TUA)
      .text(String(i), 0, y, {
        align: 'center',
        width: pdf.page.width,
        height: 20,
        lineBreak: false,
      });
  }
}

/**
 * Render satu bab sambil melacak halaman tiap subbab ("2.1 ...") dan judul
 * tabel ("Tabel 2.1 ...") di dalamnya, dipecah pada baris yang cocok supaya
 * nomor halamannya presisi (bukan hanya halaman awal bab).
 */
function renderBabTerlacak(pdf, teksBab, { onSubbab, onTabel, landscapeUntukTabel } = {}) {
  const baris = String(teksBab || '').split(/\r?\n/);
  let segmen = [];
  let modeLandscape = false;
  const bilas = () => {
    if (!segmen.length) return;
    renderMarkdownToPdf(pdf, segmen.join('\n'), { lineGap: PDF_LINE_GAP, hangingIndentList: true, ...HEADER_TABEL_PDF });
    segmen = [];
  };
  for (const l of baris) {
    const t = l.trim();
    const cocokSubbab = SUBBAB_REGEX.test(t);
    const cocokTabel = TABEL_CAPTION_REGEX.test(t);
    if (cocokSubbab || cocokTabel) {
      bilas();
      const perluLandscape = cocokTabel && landscapeUntukTabel && landscapeUntukTabel(t);
      // Kembali ke potret dulu kalau segmen sebelumnya landscape tapi yang
      // baru bukan tabel lebar lagi — supaya narasi biasa tidak ikut melebar.
      if (modeLandscape && !perluLandscape) {
        nextPortraitBerpita(pdf);
        modeLandscape = false;
      }
      if (perluLandscape && !modeLandscape) {
        addLandscape(pdf);
        modeLandscape = true;
      }
      const halaman = labelHalaman(pdf);
      if (cocokTabel && onTabel) onTabel(t, halaman);
      else if (onSubbab) onSubbab(t, halaman);
    }
    segmen.push(l);
  }
  bilas();
  if (modeLandscape) nextPortraitBerpita(pdf);
}

/** Tulis satu daftar dua-kolom (judul kiri, nomor halaman kanan) pada halaman aktif.
 * Nomor halaman disejajarkan ke BARIS TERAKHIR judul, supaya tetap rapi walau
 * judulnya membungkus lebih dari satu baris. */
function tulisDaftarDuaKolom(pdf, entri, { indentSubbab = 14 } = {}) {
  const lebar = usableWidth(pdf);
  for (const e of entri) {
    pdf.font(e.tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(e.tebal ? 11 : 10.5);
    const indent = e.level ? indentSubbab : 0;
    const widthJudul = lebar - indent - 40;
    const y = pdf.y;
    const tinggiJudul = pdf.heightOfString(e.judul, { width: widthJudul });
    const tinggiBaris = pdf.currentLineHeight();
    pdf.text(e.judul, leftMargin(pdf) + indent, y, { width: widthJudul });
    pdf.text(String(e.halaman), leftMargin(pdf), y + Math.max(0, tinggiJudul - tinggiBaris), {
      width: lebar,
      align: 'right',
    });
    pdf.y = y + tinggiJudul;
    pdf.moveDown(0.55);
  }
}

/** Tulis Daftar Isi pada halaman yang sudah dicadangkan sebelumnya. */
function isiDaftarIsiPdf(pdf, halamanDaftarIsi, entri) {
  pdf.switchToPage(halamanDaftarIsi);
  pdf.x = leftMargin(pdf);
  pdf.y = topMargin(pdf);

  pdf.font('Helvetica-Bold').fontSize(14).fillColor('#000000');
  pdf.text('DAFTAR ISI', { align: 'center' });
  pdf.moveDown(1.5);

  tulisDaftarDuaKolom(pdf, entri);
}

/** Tulis Daftar Tabel pada halaman yang sudah dicadangkan sebelumnya. */
function isiDaftarTabelPdf(pdf, halamanDaftarTabel, entri) {
  pdf.switchToPage(halamanDaftarTabel);
  pdf.x = leftMargin(pdf);
  pdf.y = topMargin(pdf);

  pdf.font('Helvetica-Bold').fontSize(14).fillColor('#000000');
  pdf.text('DAFTAR TABEL', { align: 'center' });
  pdf.moveDown(1.5);

  if (!entri.length) {
    pdf.font('Helvetica').fontSize(10.5).text('Tidak ada tabel.', leftMargin(pdf));
    return;
  }
  tulisDaftarDuaKolom(pdf, entri);
}

async function buildRenjaPermendagri14Pdf(db, dokumenId) {
  const { dok, bab, tabel41, meta } = await muatKonteks(db, dokumenId);
  const pejabat = await ambilPejabatKepalaDinas(db, dok.tahun);

  return new Promise((resolve, reject) => {
    const potongan = [];
    const pdf = new PDFDocument({
      margin: PDF_THEME.PAGE_MARGIN,
      size: 'A4',
      layout: 'portrait',
      autoFirstPage: false,
      bufferPages: true,
    });
    pdf.on('data', (c) => potongan.push(c));
    pdf.on('end', () => resolve(Buffer.concat(potongan)));
    pdf.on('error', reject);

    try {
      const daftarIsiEntri = [];
      const daftarTabelEntri = [];

      // --- Sampul (tidak dihitung dalam penomoran) ---
      addPortrait(pdf);
      renderCoverPdf(pdf, meta, dok);

      // --- Kata Pengantar: halaman 1 ---
      nextPortraitBerpita(pdf);
      daftarIsiEntri.push({ judul: 'KATA PENGANTAR', halaman: labelHalaman(pdf), tebal: true });
      renderKataPengantarPdf(pdf, pejabat, meta, dok);

      // --- Daftar Isi (dicadangkan): halaman 2 ---
      nextPortraitBerpita(pdf);
      daftarIsiEntri.push({ judul: 'DAFTAR ISI', halaman: labelHalaman(pdf), tebal: true });
      const halamanDaftarIsi = labelHalaman(pdf);

      // --- Daftar Tabel (dicadangkan): halaman 3 ---
      nextPortraitBerpita(pdf);
      daftarIsiEntri.push({ judul: 'DAFTAR TABEL', halaman: labelHalaman(pdf), tebal: true });
      const halamanDaftarTabel = labelHalaman(pdf);

      // --- Isi dokumen: Bab I-III dan V-VI potret; Bab IV dipecah untuk tabel landscape ---
      // Setiap Bab WAJIB mulai di halaman baru (nextPortrait di awal iterasi,
      // bukan cuma sekali sebelum loop) — sebelumnya cuma dipanggil sekali di
      // luar loop sehingga Bab I/II/III bisa "bercampur" satu halaman kalau
      // kebetulan isi Bab sebelumnya tidak pas berakhir di batas halaman.
      for (const [kunci, teksJudul] of JUDUL_BAB.slice(0, 3)) {
        nextPortraitBerpita(pdf);
        daftarIsiEntri.push({ judul: teksJudul, halaman: labelHalaman(pdf), tebal: true });
        pdf.fontSize(12).fillColor('#000000').text(teksJudul, { align: 'center' });
        pdf.moveDown(0.4);
        renderBabTerlacak(pdf, bab[kunci], {
          onSubbab: (judul, halaman) => daftarIsiEntri.push({ judul, halaman, level: 1 }),
          onTabel: (judul, halaman) => daftarTabelEntri.push({ judul, halaman }),
          landscapeUntukTabel: kunci === 'bab2' ? (t) => TABEL_LEBAR_BAB2.test(t) : undefined,
        });
      }

      // --- Bab IV: narasi potret, tabel landscape ---
      const [sebelumTabel, sesudahTabel] = String(bab.bab4 || '').split(PENANDA_TABEL);
      nextPortraitBerpita(pdf);
      daftarIsiEntri.push({ judul: JUDUL_BAB[3][1], halaman: labelHalaman(pdf), tebal: true });
      pdf
        .fontSize(12)
        .fillColor('#000000')
        .text('BAB IV — RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH', { align: 'center' });
      pdf.moveDown(0.4);
      renderMarkdownToPdf(pdf, sebelumTabel, { lineGap: PDF_LINE_GAP, hangingIndentList: true, ...HEADER_TABEL_PDF });

      addLandscape(pdf);
      daftarTabelEntri.push({
        judul: `Tabel 4.1 Rencana Program dan Kegiatan Prioritas Daerah Tahun ${dok.tahun}`,
        halaman: labelHalaman(pdf),
      });
      const lebar = usableWidth(pdf);
      drawPdfGridTable(pdf, {
        left: leftMargin(pdf),
        yStart: pdf.y,
        cols: lebarKolom(lebar),
        headers: kepalaTabel(tabel41?.meta),
        rows: barisTabel(tabel41).slice(1), // baris penomoran sudah jadi bagian kepala
        fontSize: 6,
        ...HEADER_TABEL_PDF,
      });

      nextPortraitBerpita(pdf);
      if (sesudahTabel) renderMarkdownToPdf(pdf, sesudahTabel, { lineGap: PDF_LINE_GAP, hangingIndentList: true, ...HEADER_TABEL_PDF });

      for (const [kunci, teksJudul] of JUDUL_BAB.slice(4)) {
        nextPortraitBerpita(pdf);
        daftarIsiEntri.push({ judul: teksJudul, halaman: labelHalaman(pdf), tebal: true });
        pdf.fontSize(12).fillColor('#000000').text(teksJudul, { align: 'center' });
        pdf.moveDown(0.4);
        renderBabTerlacak(pdf, bab[kunci], {
          onSubbab: (judul, halaman) => daftarIsiEntri.push({ judul, halaman, level: 1 }),
          onTabel: (judul, halaman) => daftarTabelEntri.push({ judul, halaman }),
        });
        if (kunci === 'bab6') {
          pdf.moveDown(1.2);
          renderTandaTanganPdf(pdf, pejabat, meta, dok);
        }
      }

      pdf
        .fontSize(8)
        .fillColor('#666666')
        .text('Dokumen resmi (PDF) — ePelara · Permendagri Nomor 14 Tahun 2026', {
          align: 'left',
        });

      // --- Kembali isi Daftar Isi/Daftar Tabel & stempel nomor halaman ---
      isiDaftarIsiPdf(pdf, halamanDaftarIsi, daftarIsiEntri);
      isiDaftarTabelPdf(pdf, halamanDaftarTabel, daftarTabelEntri);
      stempelNomorHalaman(pdf);

      pdf.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  buildRenjaPermendagri14Docx,
  buildRenjaPermendagri14Pdf,
  muatKonteks,
  PENANDA_TABEL,
};
