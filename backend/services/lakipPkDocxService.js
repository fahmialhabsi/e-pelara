'use strict';

const fs = require('fs');
const path = require('path');
const {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ImageRun,
  Packer,
} = require('docx');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'branding', 'logo-maluku-utara.jpeg');
let LOGO_BUFFER = null;
try {
  LOGO_BUFFER = fs.readFileSync(LOGO_PATH);
} catch (e) {
  LOGO_BUFFER = null;
}

const makeLogoParagraph = () => {
  if (!LOGO_BUFFER) return null;
  return new Paragraph({
    children: [
      new ImageRun({
        data: LOGO_BUFFER,
        transformation: { width: 80, height: 90 },
        type: 'jpg',
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  });
};

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDER_SET = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const FONT = 'Times New Roman';

const letterFor = (idx) => String.fromCharCode(65 + idx);

const makeText = (text, options = {}) =>
  new TextRun({
    text: String(text ?? ''),
    font: FONT,
    size: options.size || 24,
    bold: Boolean(options.bold),
  });

const makeParagraph = (text, options = {}) =>
  new Paragraph({
    children: [makeText(text, options)],
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    spacing: { after: options.after ?? 160 },
  });

const makeTitle = (text) =>
  new Paragraph({
    children: [makeText(text, { bold: true, size: 32 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
  });

const makeHeading = (text) =>
  new Paragraph({
    children: [makeText(text, { bold: true, size: 26 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
  });

const makeSpacer = () => new Paragraph({ children: [makeText('')], spacing: { after: 120 } });

const makeLabelParagraph = (label, value) =>
  new Paragraph({
    children: [
      makeText(`${label.padEnd(9, ' ')}: `, {}),
      makeText(value, {}),
    ],
    spacing: { after: 40 },
  });

const makeTableCell = (text, { bold = false, width, alignment } = {}) =>
  new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    children: [makeParagraph(text, { bold, alignment: alignment || AlignmentType.LEFT })],
  });

const makeKeyValueBox = (rows) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (r) =>
        new TableRow({
          children: [
            makeTableCell(r.label, { bold: true, width: 20 }),
            makeTableCell(r.value, { width: 80 }),
          ],
        }),
    ),
  });

const makeKeyValueLampiranTable = (rows) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          makeTableCell('No.', { bold: true, width: 6, alignment: AlignmentType.CENTER }),
          makeTableCell('Sasaran Strategis', { bold: true, width: 34 }),
          makeTableCell('Indikator Kinerja', { bold: true, width: 40 }),
          makeTableCell('Target', { bold: true, width: 20, alignment: AlignmentType.CENTER }),
        ],
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: [
              makeTableCell(r.no, { alignment: AlignmentType.CENTER }),
              makeTableCell(r.sasaran),
              makeTableCell(r.indikator),
              makeTableCell(r.target, { alignment: AlignmentType.CENTER }),
            ],
          }),
      ),
    ],
  });

const makeProgramAnggaranTable = (rows) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          makeTableCell('No.', { bold: true, width: 8, alignment: AlignmentType.CENTER }),
          makeTableCell('Program', { bold: true, width: 62 }),
          makeTableCell('Jumlah Anggaran', { bold: true, width: 30, alignment: AlignmentType.CENTER }),
        ],
      }),
      ...(rows.length
        ? rows.map(
            (r) =>
              new TableRow({
                children: [
                  makeTableCell(r.no, { alignment: AlignmentType.CENTER }),
                  makeTableCell(r.nama),
                  makeTableCell(r.jumlah, { alignment: AlignmentType.CENTER }),
                ],
              }),
          )
        : [
            new TableRow({
              children: [
                new TableCell({
                  columnSpan: 3,
                  children: [
                    makeParagraph('Belum ada data program', { alignment: AlignmentType.CENTER }),
                  ],
                }),
              ],
            }),
          ]),
    ],
  });

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const fmtPct = (v, satuan) =>
  v === null || v === undefined || v === '' ? '-' : `${Number(v).toFixed(2)} ${satuan || ''}`.trim();

const fmtTanggalIndo = (dateStr) => {
  if (!dateStr) return '............................';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '............................';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const jabatanKepalaDinas = (detail) => {
  const nama = String(detail.nama_opd || '').trim();
  if (!nama) return 'Kepala Dinas';
  return /^dinas\b/i.test(nama) ? `Kepala ${nama}` : `Kepala Dinas ${nama}`;
};

const paragraphsFromMultiline = (text, options = {}) =>
  String(text || '-')
    .split(/\r?\n/)
    .map((line) => makeParagraph(line, options));

async function buildPkDocxBuffer(detail, tahun) {
  const sasaranTeknis = detail.sasaran_teknis || [];
  const pihakKedua = detail.pihak_kedua || {};
  const serapan = detail.tata_kelola?.serapan_anggaran || {};
  const tlBpk = detail.tata_kelola?.tl_bpk || {};
  const ikm = detail.tata_kelola?.ikm || {};
  const jabatanKedua = pihakKedua.jabatan || jabatanKepalaDinas(detail);
  const tataKelolaLetter = letterFor(sasaranTeknis.length);
  const namaTataKelolaSasaran = `Meningkatnya tata kelola pemerintahan ${detail.nama_opd || ''}`.trim();

  const sasaranSection = sasaranTeknis.flatMap((s, idx) => {
    const letter = letterFor(idx);
    return [
      makeParagraph(`${letter}. Sasaran Strategis ${s.isi_sasaran}`, { bold: true, after: 40 }),
      makeParagraph(`1. ${s.nama_indikator}`, { after: 60 }),
      makeKeyValueBox([
        { label: 'Output', value: s.output || '-' },
        { label: `Realisasi ${s.tahun_realisasi || ''}`, value: fmtPct(s.realisasi_tahun_lalu, s.satuan) },
        { label: `Target ${tahun}`, value: fmtPct(s.target_tahun_ini, s.satuan) },
        { label: 'Bukti Ukur', value: s.bukti_ukur || '-' },
      ]),
      makeSpacer(),
    ];
  });

  const tahunRealisasiTk = Number(tahun) - 1;
  const tataKelolaSection = [
    makeParagraph(`${tataKelolaLetter}. Tata Kelola & Akuntabilitas`, { bold: true, after: 60 }),
    makeParagraph(
      `1. Serapan Anggaran — Realisasi ${tahunRealisasiTk}: ${
        typeof serapan.persen === 'number' ? serapan.persen + '%' : 'Belum tersedia'
      } — Target ${tahun}: ${detail.target_serapan_anggaran || '-'}`,
      { after: 40 },
    ),
    makeParagraph(
      `2. Tindak Lanjut Temuan BPK — Realisasi ${tahunRealisasiTk}: ${
        typeof tlBpk.persen === 'number' ? tlBpk.persen + '%' : 'Belum tersedia'
      } — Target ${tahun}: ${detail.target_tl_bpk || '-'}`,
      { after: 40 },
    ),
    makeParagraph(
      `3. Indeks Kepuasan Masyarakat Layanan — Realisasi ${tahunRealisasiTk}: ${
        ikm?.skor ?? '-'
      } — Target ${tahun}: ${detail.target_ikm || '-'}`,
      { after: 160 },
    ),
  ];

  const lampiranRows = sasaranTeknis.map((s, idx) => ({
    no: String(idx + 1),
    sasaran: s.isi_sasaran,
    indikator: s.nama_indikator,
    target: fmtPct(s.target_tahun_ini, s.satuan),
  }));
  lampiranRows.push(
    {
      no: String(sasaranTeknis.length + 1),
      sasaran: namaTataKelolaSasaran,
      indikator: 'Serapan Anggaran',
      target: detail.target_serapan_anggaran || '-',
    },
    {
      no: String(sasaranTeknis.length + 2),
      sasaran: namaTataKelolaSasaran,
      indikator: 'Tindak Lanjut Temuan BPK',
      target: detail.target_tl_bpk || '-',
    },
    {
      no: String(sasaranTeknis.length + 3),
      sasaran: namaTataKelolaSasaran,
      indikator: 'Indeks Kepuasan Masyarakat',
      target: detail.target_ikm || '-',
    },
  );

  const programRows = (detail.program_anggaran || []).map((p, idx) => ({
    no: String(idx + 1),
    nama: p.nama_program,
    jumlah: fmtRp(p.jumlah_anggaran),
  }));

  const logoParagraph = makeLogoParagraph();
  const children = [
    ...(logoParagraph ? [logoParagraph] : []),
    makeTitle('PERJANJIAN KINERJA'),
    makeTitle('KEPALA DINAS PANGAN'),
    makeTitle('PROVINSI MALUKU UTARA'),
    makeTitle(`TAHUN ANGGARAN ${tahun}`),
    makeSpacer(),

    makeParagraph(
      'Dalam rangka mewujudkan akuntabilitas kinerja instansi pemerintah, kami yang bertanda tangan dibawah ini:',
    ),

    makeParagraph('PIHAK PERTAMA', { bold: true, after: 40 }),
    makeLabelParagraph('Nama', detail.pihak_pertama_nama),
    makeLabelParagraph('Jabatan', detail.pihak_pertama_jabatan),
    makeSpacer(),

    makeParagraph('PIHAK KEDUA', { bold: true, after: 40 }),
    makeLabelParagraph(
      'Nama',
      pihakKedua.nama || 'Belum diisi — lengkapi di menu Setting Pejabat Penandatangan',
    ),
    makeLabelParagraph('Jabatan', jabatanKedua),
    makeSpacer(),

    makeParagraph(
      `Menyatakan sepakat untuk mengikatkan diri dalam Perjanjian Kinerja Tahun Anggaran ${tahun} dengan ketentuan sebagai berikut:`,
    ),

    makeHeading('Pasal 1'),
    new Paragraph({
      children: [makeText('Tujuan Perjanjian Kinerja', { bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    ...paragraphsFromMultiline(detail.pasal1_tujuan),

    makeHeading('Pasal 2'),
    new Paragraph({
      children: [makeText('Sasaran Kinerja dan Output Terukur', { bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    makeParagraph('PIHAK KEDUA WAJIB mencapai target berikut:', { after: 100 }),
    ...sasaranSection,
    ...tataKelolaSection,

    makeHeading('Pasal 3'),
    new Paragraph({
      children: [makeText('Evaluasi Berkala', { bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    ...paragraphsFromMultiline(detail.pasal3_evaluasi),

    makeHeading('Pasal 4'),
    new Paragraph({
      children: [makeText('Konsekuensi Kinerja', { bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    ...paragraphsFromMultiline(detail.pasal4_konsekuensi),

    makeHeading('Pasal 5'),
    new Paragraph({
      children: [makeText('Larangan dan Etika Kinerja', { bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    ...paragraphsFromMultiline(detail.pasal5_larangan),
    ...paragraphsFromMultiline(detail.pasal5_etika),

    makeHeading('Pasal 6'),
    new Paragraph({
      children: [makeText('Penutup', { bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    ...paragraphsFromMultiline(detail.pasal6_penutup),

    makeSpacer(),
    makeParagraph(`Sofifi, ${fmtTanggalIndo(detail.tanggal_ttd)}`, {
      alignment: AlignmentType.RIGHT,
    }),
    makeSpacer(),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: NO_BORDER_SET,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                makeParagraph('PIHAK PERTAMA', {
                  bold: true,
                  alignment: AlignmentType.CENTER,
                  after: 20,
                }),
                makeParagraph(String(detail.pihak_pertama_jabatan || '').toUpperCase(), {
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              borders: NO_BORDER_SET,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                makeParagraph('PIHAK KEDUA', {
                  bold: true,
                  alignment: AlignmentType.CENTER,
                  after: 20,
                }),
                makeParagraph(jabatanKedua.toUpperCase(), { alignment: AlignmentType.CENTER }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ borders: NO_BORDER_SET, children: [makeSpacer(), makeSpacer()] }),
            new TableCell({ borders: NO_BORDER_SET, children: [makeSpacer(), makeSpacer()] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: NO_BORDER_SET,
              children: [
                makeParagraph(detail.pihak_pertama_nama, {
                  bold: true,
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              borders: NO_BORDER_SET,
              children: [
                makeParagraph(pihakKedua.nama || '..............................', {
                  bold: true,
                  alignment: AlignmentType.CENTER,
                }),
                makeParagraph(`NIP. ${pihakKedua.nip || '-'}`, { alignment: AlignmentType.CENTER }),
              ],
            }),
          ],
        }),
      ],
    }),

    new Paragraph({ children: [], pageBreakBefore: true }),
    makeTitle(`LAMPIRAN: INDIKATOR KINERJA UTAMA TAHUN ${tahun}`),
    makeKeyValueLampiranTable(lampiranRows),
    makeSpacer(),
    makeHeading('Program & Anggaran'),
    makeProgramAnggaranTable(programRows),
  ];

  const doc = new Document({
    creator: 'Dinas Pangan Provinsi Maluku Utara',
    title: `Perjanjian Kinerja ${detail.nama_opd} ${tahun}`,
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { buildPkDocxBuffer };
