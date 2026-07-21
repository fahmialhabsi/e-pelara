// backend/services/mr/mrPlanningTlhpReportExportWordService.js

"use strict";

const {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = require("docx");

const reportQueryService = require("./mrPlanningTlhpReportQueryService");

const safeText = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

const formatRp = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return "-";
  return `Rp ${num.toLocaleString("id-ID")}`;
};

const PORTRAIT_PAGE = {
  page: {
    size: { orientation: PageOrientation.PORTRAIT },
    margin: { top: 1000, bottom: 1000, left: 1200, right: 1000 },
  },
};

const LANDSCAPE_PAGE = {
  page: {
    size: { orientation: PageOrientation.LANDSCAPE },
    margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
  },
};

const makeTitle = (text) =>
  new Paragraph({
    text,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });

const makeHeading1 = (text) =>
  new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 150 },
  });

const makeParagraph = (text, options = {}) =>
  new Paragraph({
    children: [new TextRun({ text: safeText(text, ""), ...options })],
    spacing: { after: 120 },
  });

const makeCell = (text, { bold = false, width = null, shading = null } = {}) =>
  new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: shading ? { fill: shading } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text: safeText(text, ""), bold })],
      }),
    ],
  });

const makeTable = (headerRow, bodyRows, widths = null) => {
  const rows = [
    new TableRow({
      children: headerRow.map((h, i) => makeCell(h, { bold: true, width: widths?.[i], shading: "D9D9D9" })),
      tableHeader: true,
    }),
    ...bodyRows.map(
      (row) =>
        new TableRow({
          children: row.map((cell, i) => makeCell(cell, { width: widths?.[i] })),
        }),
    ),
  ];

  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
};

const buildScopeDescription = (scope) => {
  const parts = [`Tahun Pemantauan ${scope.tahun}`];
  if (scope.nama_opd) parts.push(`OPD ${scope.nama_opd}`);
  else if (scope.is_multi_opd) parts.push("Seluruh OPD");
  return parts.join(" — ");
};

const buildTlhpWordDocument = async (scopeParams) => {
  const report = await reportQueryService.getFullReport(scopeParams);
  const { report_scope: scope, lhp_list: lhpList, temuan_rekomendasi_detail: detail, summary, officials } = report;

  const sections = [];

  // Cover
  sections.push(
    makeTitle("LAPORAN PEMANTAUAN TINDAK LANJUT HASIL PEMERIKSAAN (TLHP)"),
    new Paragraph({
      text: buildScopeDescription(scope),
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  // 1. Dasar Pemantauan
  sections.push(
    makeHeading1("1. Dasar Pemantauan"),
    makeParagraph(
      "Pemantauan tindak lanjut hasil pemeriksaan/pengawasan ini disusun berdasarkan Undang-Undang Nomor 15 Tahun 2004 tentang Pemeriksaan Pengelolaan dan Tanggung Jawab Keuangan Negara, Undang-Undang Nomor 15 Tahun 2006 tentang Badan Pemeriksa Keuangan, Peraturan Pemerintah Nomor 60 Tahun 2008 tentang Sistem Pengendalian Intern Pemerintah, Peraturan Menteri Dalam Negeri Nomor 33 Tahun 2019 tentang Pedoman Pembinaan dan Pengawasan Penyelenggaraan Pemerintahan Daerah, serta Peraturan BPK Nomor 2 Tahun 2023 tentang Sistem Informasi Pemantauan Tindak Lanjut (SIPTL).",
    ),
  );

  // 2. Ruang Lingkup
  sections.push(
    makeHeading1("2. Ruang Lingkup Pemantauan"),
    makeParagraph(
      `Laporan ini mencakup ${lhpList.length} Laporan Hasil Pemeriksaan/Pengawasan (LHP) pada tahun ${scope.tahun}${
        scope.nama_opd ? ` untuk ${scope.nama_opd}` : ""
      }, dengan total ${summary.total_temuan} temuan dan ${summary.total_rekomendasi} rekomendasi tindak lanjut.`,
    ),
  );

  // 3. Ringkasan Data LHP
  sections.push(
    makeHeading1("3. Ringkasan Data LHP"),
    makeTable(
      ["Nomor LHP", "Entitas", "Jenis Pemeriksaan", "Tanggal LHP", "Jml Temuan", "Jml Rekomendasi"],
      lhpList.map((l) => [
        l.nomor_lhp,
        l.entitas_pemeriksa,
        l.jenis_pemeriksaan,
        l.tanggal_lhp,
        String(l.jumlah_temuan),
        String(l.jumlah_rekomendasi),
      ]),
      [22, 16, 22, 14, 13, 13],
    ),
  );

  // 4. Rekap Capaian
  sections.push(
    makeHeading1("4. Rekapitulasi Capaian Tindak Lanjut"),
    makeParagraph(
      `Dari ${summary.total_rekomendasi} rekomendasi, ${summary.rekomendasi_selesai} rekomendasi (${summary.capaian_persen}%) telah dinyatakan Sesuai/Selesai.`,
    ),
    makeTable(
      ["Status Tindak Lanjut", "Jumlah Rekomendasi"],
      Object.entries(summary.breakdown_status).map(([status, jumlah]) => [status, String(jumlah)]),
      [70, 30],
    ),
    makeHeading1("Rekapitulasi per Entitas Pemeriksa"),
    makeTable(
      ["Entitas Pemeriksa", "Jumlah Temuan"],
      Object.entries(summary.breakdown_entitas).map(([entitas, jumlah]) => [entitas, String(jumlah)]),
      [70, 30],
    ),
  );

  // 5. Lampiran detail (landscape)
  const detailRows = detail.map((row, i) => [
    String(i + 1),
    row.temuan.nomor_temuan,
    row.temuan.judul_temuan,
    row.rekomendasi ? row.rekomendasi.nomor_rekomendasi : "-",
    row.rekomendasi ? row.rekomendasi.uraian_rekomendasi : "Belum ada rekomendasi",
    row.rekomendasi ? safeText(row.rekomendasi.pihak_bertanggung_jawab) : "-",
    row.rekomendasi ? safeText(row.rekomendasi.status_tindak_lanjut, "Belum Ditindaklanjuti") : "-",
    row.rekomendasi ? `${row.rekomendasi.persentase_penyelesaian || 0}%` : "0%",
    row.temuan.nilai_temuan_rupiah ? formatRp(row.temuan.nilai_temuan_rupiah) : "-",
  ]);

  // Titik potong ke section landscape — dicatat sekarang (bukan dicari lagi
  // lewat introspeksi instance docx setelah array selesai disusun, karena
  // docx tidak mengekspos opsi paragraph apa adanya untuk dibaca ulang).
  const landscapeBreakIndex = sections.length;

  sections.push(
    makeHeading1("5. Lampiran Detail Temuan dan Rekomendasi"),
    makeTable(
      ["No", "No. Temuan", "Uraian Temuan", "No. Rek.", "Uraian Rekomendasi", "PIC", "Status TL", "% Selesai", "Nilai (Rp)"],
      detailRows,
      [4, 9, 20, 7, 25, 12, 11, 6, 10],
    ),
  );

  // 6. Penutup
  sections.push(
    makeHeading1("6. Penutup"),
    makeParagraph(
      `Status dokumen: ${report.report_approval_gate.document_status_label}. ${report.report_approval_gate.closing_note}`,
    ),
  );

  // 7. Pengesahan
  const penandatangan = officials?.penandatangan_laporan;

  sections.push(
    makeHeading1("7. Pengesahan"),
    makeParagraph(`Sofifi, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`),
    makeParagraph(safeText(penandatangan?.jabatan, "Jabatan Belum Diisi")),
    new Paragraph({ text: "", spacing: { before: 800 } }),
    makeParagraph(safeText(penandatangan?.nama, "Nama Belum Diisi"), { bold: true }),
    makeParagraph(penandatangan?.nip ? `NIP. ${penandatangan.nip}` : "NIP. Belum Diisi"),
  );

  // 2 section: portrait untuk narasi, landscape untuk lampiran detail supaya
  // tabel lampiran yang lebar tidak terpotong.
  const finalDoc = new Document({
    sections: [
      { properties: PORTRAIT_PAGE, children: sections.slice(0, landscapeBreakIndex) },
      { properties: LANDSCAPE_PAGE, children: sections.slice(landscapeBreakIndex) },
    ],
  });

  const buffer = await Packer.toBuffer(finalDoc);

  const filenameOpd = (scope.nama_opd || "SeluruhOPD").replace(/[^a-zA-Z0-9]+/g, "_");
  const filename = `Laporan_Pemantauan_TLHP_${filenameOpd}_${scope.tahun}.docx`;

  return { buffer, filename, report };
};

module.exports = {
  buildTlhpWordDocument,
};
