// backend/services/mr/mrPlanningTlhpReportExportWordService.js

'use strict';

const {
  AlignmentType,
  BorderStyle,
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
} = require('docx');

const reportQueryService = require('./mrPlanningTlhpReportQueryService');

const safeText = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const formatRp = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return '-';
  return `Rp ${num.toLocaleString('id-ID')}`;
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
    children: [new TextRun({ text: safeText(text, ''), ...options })],
    spacing: { after: 120 },
  });

const makeCell = (text, { bold = false, width = null, shading = null } = {}) =>
  new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: shading ? { fill: shading } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text: safeText(text, ''), bold })],
      }),
    ],
  });

// Sel utk tabel Matriks resmi Inspektorat — beda dari makeCell krn perlu
// rowSpan (blok per Temuan) & columnSpan (header 2 tingkat, baris label
// kelompok Jenis Pemeriksaan).
const matrixCell = (text, { bold = false, width = null, shading = null, rowSpan = 1, columnSpan = 1, align = null } = {}) =>
  new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: shading ? { fill: shading } : undefined,
    rowSpan: rowSpan > 1 ? rowSpan : undefined,
    columnSpan: columnSpan > 1 ? columnSpan : undefined,
    children: [
      new Paragraph({
        alignment: align || undefined,
        children: [new TextRun({ text: safeText(text, ''), bold })],
      }),
    ],
  });

const MATRIX_COLUMN_WIDTHS = [3, 14, 3, 6, 16, 3, 6, 4, 11, 6, 6, 3, 3, 3, 3, 8, 2];

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDER_SET = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

const makeTable = (headerRow, bodyRows, widths = null) => {
  const rows = [
    new TableRow({
      children: headerRow.map((h, i) =>
        makeCell(h, { bold: true, width: widths?.[i], shading: 'D9D9D9' }),
      ),
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
  else if (scope.is_multi_opd) parts.push('Seluruh OPD');
  return parts.join(' — ');
};

const buildTlhpWordDocument = async (scopeParams, options = {}) => {
  const { draft = false } = options;
  const report = await reportQueryService.getFullReport(scopeParams);
  const {
    report_scope: scope,
    lhp_list: lhpList,
    temuan_rekomendasi_detail: detail,
    summary,
    officials,
  } = report;

  const sections = [];

  // Cover
  sections.push(
    makeTitle('LAPORAN PEMANTAUAN TINDAK LANJUT HASIL PEMERIKSAAN (TLHP)'),
    new Paragraph({
      text: buildScopeDescription(scope),
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  // 1. Dasar Pemantauan
  sections.push(
    makeHeading1('1. Dasar Pemantauan'),
    makeParagraph(
      'Pemantauan tindak lanjut hasil pemeriksaan/pengawasan ini disusun berdasarkan Undang-Undang Nomor 15 Tahun 2004 tentang Pemeriksaan Pengelolaan dan Tanggung Jawab Keuangan Negara, Undang-Undang Nomor 15 Tahun 2006 tentang Badan Pemeriksa Keuangan, Peraturan Pemerintah Nomor 60 Tahun 2008 tentang Sistem Pengendalian Intern Pemerintah, Peraturan Menteri Dalam Negeri Nomor 33 Tahun 2019 tentang Pedoman Pembinaan dan Pengawasan Penyelenggaraan Pemerintahan Daerah, serta Peraturan BPK Nomor 2 Tahun 2023 tentang Sistem Informasi Pemantauan Tindak Lanjut (SIPTL).',
    ),
  );

  // 2. Ruang Lingkup
  sections.push(
    makeHeading1('2. Ruang Lingkup Pemantauan'),
    makeParagraph(
      `Laporan ini mencakup ${lhpList.length} Laporan Hasil Pemeriksaan/Pengawasan (LHP) pada tahun ${scope.tahun}${
        scope.nama_opd ? ` untuk ${scope.nama_opd}` : ''
      }, dengan total ${summary.total_temuan} temuan dan ${summary.total_rekomendasi} rekomendasi tindak lanjut.`,
    ),
  );

  // 3. Ringkasan Data LHP
  sections.push(
    makeHeading1('3. Ringkasan Data LHP'),
    makeTable(
      ['Nomor LHP', 'Entitas', 'Jenis Pemeriksaan', 'Tanggal LHP', 'Jml Temuan', 'Jml Rekomendasi', 'Surat Pengantar'],
      lhpList.map((l) => [
        l.nomor_lhp,
        l.entitas_pemeriksa,
        l.jenis_pemeriksaan,
        l.tanggal_lhp,
        String(l.jumlah_temuan),
        String(l.jumlah_rekomendasi),
        l.nomor_surat_pengantar
          ? `${safeText(l.nomor_surat_pengantar)}${l.tanggal_surat_pengantar ? ` (${l.tanggal_surat_pengantar})` : ''}`
          : '-',
      ]),
      [18, 14, 18, 12, 10, 10, 18],
    ),
  );

  // 4. Rekap Capaian
  sections.push(
    makeHeading1('4. Rekapitulasi Capaian Tindak Lanjut'),
    makeParagraph(
      `Dari ${summary.total_rekomendasi} rekomendasi, ${summary.rekomendasi_selesai} rekomendasi (${summary.capaian_persen}%) telah dinyatakan Sesuai/Selesai.`,
    ),
    makeTable(
      ['Status Tindak Lanjut', 'Jumlah Rekomendasi'],
      Object.entries(summary.breakdown_status).map(([status, jumlah]) => [status, String(jumlah)]),
      [70, 30],
    ),
    makeHeading1('Rekapitulasi per Entitas Pemeriksa'),
    makeTable(
      ['Entitas Pemeriksa', 'Jumlah Temuan'],
      Object.entries(summary.breakdown_entitas).map(([entitas, jumlah]) => [
        entitas,
        String(jumlah),
      ]),
      [70, 30],
    ),
  );

  // 5. Lampiran detail (landscape)
  const detailRows = detail.map((row, i) => [
    String(i + 1),
    row.temuan.nomor_temuan,
    row.temuan.judul_temuan,
    row.rekomendasi ? row.rekomendasi.nomor_rekomendasi : '-',
    row.rekomendasi ? row.rekomendasi.uraian_rekomendasi : 'Belum ada rekomendasi',
    row.rekomendasi ? safeText(row.rekomendasi.pihak_bertanggung_jawab) : '-',
    row.rekomendasi ? safeText(row.rekomendasi.status_tindak_lanjut, 'Belum Ditindaklanjuti') : '-',
    row.rekomendasi ? `${row.rekomendasi.persentase_penyelesaian || 0}%` : '0%',
    row.temuan.nilai_temuan_rupiah ? formatRp(row.temuan.nilai_temuan_rupiah) : '-',
  ]);

  // Titik potong ke section landscape — dicatat sekarang (bukan dicari lagi
  // lewat introspeksi instance docx setelah array selesai disusun, karena
  // docx tidak mengekspos opsi paragraph apa adanya untuk dibaca ulang).
  const landscapeBreakIndex = sections.length;

  sections.push(
    makeHeading1('5. Lampiran Detail Temuan dan Rekomendasi'),
    makeTable(
      [
        'No',
        'No. Temuan',
        'Uraian Temuan',
        'No. Rekomendasi',
        'Uraian Rekomendasi',
        'PIC',
        'Status TL',
        '% Selesai',
        'Nilai (Rp)',
      ],
      detailRows,
      [4, 9, 20, 7, 25, 12, 11, 6, 10],
    ),
  );

  // 6. Matriks Pemantauan Tindak Lanjut Hasil Pemeriksaan BPK — format resmi
  // Inspektorat Prov. Maluku Utara (dikonfirmasi dari contoh dokumen asli
  // 2026-07-26): baris dikelompokkan per Temuan (kolom Temuan digabung/
  // rowSpan sekali per blok, Rekomendasi jadi baris huruf di bawahnya), kolom
  // "Jml" (selalu bernilai 1 per baris — penanda "1 Temuan"/"1 Rekomendasi",
  // bukan agregat), kolom Status dipecah 4 (N/Ad utk status_matriks, N/Ad utk
  // status_spj), baris label kelompok Jenis Pemeriksaan (LKPD/LKj + tahun) di
  // atas tiap blok, dan baris "Jumlah" total di akhir.
  const sisaByTemuan = report.sisa_by_temuan || {};
  const lhpById = new Map(lhpList.map((l) => [l.id, l]));

  const jenisGroupLabel = (lhp) => {
    const jenis = String(lhp?.jenis_pemeriksaan || '').toLowerCase();
    const tahunLhp = lhp?.tahun || scope.tahun;
    if (jenis.includes('keuangan')) return `LKPD ${tahunLhp}`;
    if (jenis.includes('kinerja')) return `LKj ${tahunLhp}`;
    return `${safeText(lhp?.jenis_pemeriksaan, 'Pemeriksaan')} ${tahunLhp}`;
  };

  // detail sudah terurut per Temuan (order by id ASC) dgn rekomendasi
  // berdampingan (lihat mrPlanningTlhpReportQueryService.getTemuanRekomendasiDetail)
  // — cukup group-by berurutan, tidak perlu sort ulang.
  const matriksGroups = [];
  const groupIndexByLabel = new Map();
  const temuanBlockIndexByKey = new Map();

  detail.forEach((row) => {
    const lhp = lhpById.get(row.temuan.mr_planning_lhp_id);
    const label = jenisGroupLabel(lhp);

    if (!groupIndexByLabel.has(label)) {
      groupIndexByLabel.set(label, matriksGroups.length);
      matriksGroups.push({ label, temuanBlocks: [] });
    }
    const group = matriksGroups[groupIndexByLabel.get(label)];

    const blockKey = `${label}:${row.temuan.id}`;
    if (!temuanBlockIndexByKey.has(blockKey)) {
      temuanBlockIndexByKey.set(blockKey, group.temuanBlocks.length);
      group.temuanBlocks.push({ temuan: row.temuan, rows: [] });
    }
    group.temuanBlocks[temuanBlockIndexByKey.get(blockKey)].rows.push(row);
  });

  const MATRIX_HEADER_ROW_1 = [
    matrixCell('No', { bold: true, rowSpan: 2, width: MATRIX_COLUMN_WIDTHS[0], shading: 'D9D9D9' }),
    matrixCell('Temuan Pemeriksaan', { bold: true, columnSpan: 3, shading: 'D9D9D9', align: AlignmentType.CENTER }),
    matrixCell('Rekomendasi', { bold: true, columnSpan: 3, shading: 'D9D9D9', align: AlignmentType.CENTER }),
    matrixCell('Tindak Lanjut', { bold: true, columnSpan: 2, shading: 'D9D9D9', align: AlignmentType.CENTER }),
    matrixCell('Setor', { bold: true, rowSpan: 2, width: MATRIX_COLUMN_WIDTHS[9], shading: 'D9D9D9' }),
    matrixCell('Sisa', { bold: true, rowSpan: 2, width: MATRIX_COLUMN_WIDTHS[10], shading: 'D9D9D9' }),
    matrixCell('Status', { bold: true, columnSpan: 4, shading: 'D9D9D9', align: AlignmentType.CENTER }),
    matrixCell('Rencana Aksi', { bold: true, rowSpan: 2, width: MATRIX_COLUMN_WIDTHS[15], shading: 'D9D9D9' }),
    matrixCell('Ket', { bold: true, rowSpan: 2, width: MATRIX_COLUMN_WIDTHS[16], shading: 'D9D9D9' }),
  ];

  const MATRIX_HEADER_ROW_2 = [
    matrixCell('Uraian', { bold: true, width: MATRIX_COLUMN_WIDTHS[1], shading: 'D9D9D9' }),
    matrixCell('Jml', { bold: true, width: MATRIX_COLUMN_WIDTHS[2], shading: 'D9D9D9' }),
    matrixCell('Nilai', { bold: true, width: MATRIX_COLUMN_WIDTHS[3], shading: 'D9D9D9' }),
    matrixCell('Uraian', { bold: true, width: MATRIX_COLUMN_WIDTHS[4], shading: 'D9D9D9' }),
    matrixCell('Jml', { bold: true, width: MATRIX_COLUMN_WIDTHS[5], shading: 'D9D9D9' }),
    matrixCell('Nilai', { bold: true, width: MATRIX_COLUMN_WIDTHS[6], shading: 'D9D9D9' }),
    matrixCell('Sesuai', { bold: true, width: MATRIX_COLUMN_WIDTHS[7], shading: 'D9D9D9' }),
    matrixCell('Uraian Tindak Lanjut', { bold: true, width: MATRIX_COLUMN_WIDTHS[8], shading: 'D9D9D9' }),
    matrixCell('N', { bold: true, width: MATRIX_COLUMN_WIDTHS[11], shading: 'D9D9D9' }),
    matrixCell('Ad', { bold: true, width: MATRIX_COLUMN_WIDTHS[12], shading: 'D9D9D9' }),
    matrixCell('SPJ-N', { bold: true, width: MATRIX_COLUMN_WIDTHS[13], shading: 'D9D9D9' }),
    matrixCell('SPJ-Ad', { bold: true, width: MATRIX_COLUMN_WIDTHS[14], shading: 'D9D9D9' }),
  ];

  const matrixBodyRows = [];
  let runningNo = 0;
  let totalNilaiTemuan = 0;
  let totalNilaiRekomendasi = 0;
  let totalSetoran = 0;
  let totalSisa = 0;
  let totalRekomendasi = 0;
  let countStatusN = 0;
  let countStatusAd = 0;
  let countSpjN = 0;
  let countSpjAd = 0;

  matriksGroups.forEach((group) => {
    matrixBodyRows.push(
      new TableRow({
        children: [matrixCell(group.label, { bold: true, columnSpan: 17, shading: 'F2F2F2' })],
      }),
    );

    group.temuanBlocks.forEach((block) => {
      runningNo += 1;
      totalNilaiTemuan += Number(block.temuan.nilai_temuan_rupiah) || 0;
      const rowSpanCount = block.rows.length;

      block.rows.forEach((row, idx) => {
        const tl = row.tindakLanjut;
        const rekomendasi = row.rekomendasi;
        const sesuai = rekomendasi?.status_tindak_lanjut === 'Sesuai/Selesai' ? 'Ya' : 'Tidak';
        const statusN = tl?.status_matriks === 'belum' ? '1' : '-';
        const statusAd = tl?.status_matriks === 'ada' ? '1' : '-';
        const spjN = tl?.status_spj === 'belum' ? '1' : '-';
        const spjAd = tl?.status_spj === 'ada' ? '1' : '-';

        if (rekomendasi) {
          totalRekomendasi += 1;
          totalNilaiRekomendasi += Number(rekomendasi.nilai_rekomendasi_rupiah) || 0;
        }
        if (tl) {
          totalSetoran += Number(tl.nilai_setoran_rupiah) || 0;
          if (tl.status_matriks === 'belum') countStatusN += 1;
          if (tl.status_matriks === 'ada') countStatusAd += 1;
          if (tl.status_spj === 'belum') countSpjN += 1;
          if (tl.status_spj === 'ada') countSpjAd += 1;
        }

        const cells = [];

        if (idx === 0) {
          totalSisa += Number(sisaByTemuan[block.temuan.id]) || 0;
          cells.push(matrixCell(String(runningNo), { rowSpan: rowSpanCount, width: MATRIX_COLUMN_WIDTHS[0] }));
          cells.push(
            matrixCell(block.temuan.uraian_temuan || block.temuan.judul_temuan, {
              rowSpan: rowSpanCount,
              width: MATRIX_COLUMN_WIDTHS[1],
            }),
          );
          cells.push(matrixCell('1', { rowSpan: rowSpanCount, width: MATRIX_COLUMN_WIDTHS[2] }));
          cells.push(
            matrixCell(formatRp(block.temuan.nilai_temuan_rupiah), { rowSpan: rowSpanCount, width: MATRIX_COLUMN_WIDTHS[3] }),
          );
        }

        cells.push(
          matrixCell(rekomendasi ? rekomendasi.uraian_rekomendasi : 'Belum ada rekomendasi', {
            width: MATRIX_COLUMN_WIDTHS[4],
          }),
        );
        cells.push(matrixCell(rekomendasi ? '1' : '-', { width: MATRIX_COLUMN_WIDTHS[5] }));
        cells.push(matrixCell(rekomendasi ? formatRp(rekomendasi.nilai_rekomendasi_rupiah) : '-', { width: MATRIX_COLUMN_WIDTHS[6] }));
        cells.push(matrixCell(rekomendasi ? sesuai : '-', { width: MATRIX_COLUMN_WIDTHS[7] }));
        cells.push(matrixCell(tl ? safeText(tl.uraian_tindak_lanjut) : 'Belum ada pemantauan', { width: MATRIX_COLUMN_WIDTHS[8] }));
        cells.push(matrixCell(tl ? formatRp(tl.nilai_setoran_rupiah) : '-', { width: MATRIX_COLUMN_WIDTHS[9] }));
        cells.push(matrixCell(formatRp(sisaByTemuan[block.temuan.id]), { width: MATRIX_COLUMN_WIDTHS[10] }));
        cells.push(matrixCell(statusN, { width: MATRIX_COLUMN_WIDTHS[11] }));
        cells.push(matrixCell(statusAd, { width: MATRIX_COLUMN_WIDTHS[12] }));
        cells.push(matrixCell(spjN, { width: MATRIX_COLUMN_WIDTHS[13] }));
        cells.push(matrixCell(spjAd, { width: MATRIX_COLUMN_WIDTHS[14] }));
        cells.push(matrixCell(tl ? safeText(tl.daftar_dokumen_pendukung) : '-', { width: MATRIX_COLUMN_WIDTHS[15] }));
        cells.push(matrixCell(tl ? safeText(tl.keterangan) : '-', { width: MATRIX_COLUMN_WIDTHS[16] }));

        matrixBodyRows.push(new TableRow({ children: cells }));
      });
    });
  });

  // Baris Jumlah — total lintas kelompok, mengikuti pola dokumen asli.
  matrixBodyRows.push(
    new TableRow({
      children: [
        matrixCell('Jumlah', { bold: true, columnSpan: 2, shading: 'F2F2F2' }),
        matrixCell(String(runningNo), { bold: true, shading: 'F2F2F2' }),
        matrixCell(formatRp(totalNilaiTemuan), { bold: true, shading: 'F2F2F2' }),
        matrixCell('-', { bold: true, shading: 'F2F2F2' }),
        matrixCell(String(totalRekomendasi), { bold: true, shading: 'F2F2F2' }),
        matrixCell(formatRp(totalNilaiRekomendasi), { bold: true, shading: 'F2F2F2' }),
        matrixCell('-', { bold: true, shading: 'F2F2F2' }),
        matrixCell('-', { bold: true, shading: 'F2F2F2' }),
        matrixCell(formatRp(totalSetoran), { bold: true, shading: 'F2F2F2' }),
        matrixCell(formatRp(totalSisa), { bold: true, shading: 'F2F2F2' }),
        matrixCell(String(countStatusN), { bold: true, shading: 'F2F2F2' }),
        matrixCell(String(countStatusAd), { bold: true, shading: 'F2F2F2' }),
        matrixCell(String(countSpjN), { bold: true, shading: 'F2F2F2' }),
        matrixCell(String(countSpjAd), { bold: true, shading: 'F2F2F2' }),
        matrixCell('-', { bold: true, shading: 'F2F2F2' }),
        matrixCell('-', { bold: true, shading: 'F2F2F2' }),
      ],
    }),
  );

  sections.push(
    makeHeading1('6. Matriks Pemantauan Tindak Lanjut Hasil Pemeriksaan BPK RI Perwakilan Maluku Utara'),
    makeParagraph(
      `SKPD: ${safeText(scope.nama_opd, 'Seluruh OPD')}. Format matriks mengikuti dokumen resmi Inspektorat Provinsi Maluku Utara — kolom Status/SPJ: N = Belum, Ad = Ada.`,
    ),
    new Table({
      rows: [
        new TableRow({ children: MATRIX_HEADER_ROW_1, tableHeader: true }),
        new TableRow({ children: MATRIX_HEADER_ROW_2, tableHeader: true }),
        ...matrixBodyRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({ text: '', spacing: { before: 200 } }),
    makeParagraph('Sofifi, ' + new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })),
  );

  sections.push(
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({ borders: NO_BORDER_SET, width: { size: 50, type: WidthType.PERCENTAGE }, children: [makeParagraph('INSPEKTUR PROVINSI MALUKU UTARA')] }),
            new TableCell({ borders: NO_BORDER_SET, width: { size: 50, type: WidthType.PERCENTAGE }, children: [makeParagraph('KASUBAG HUKUM DAN EVALUASI PENGAWASAN')] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ borders: NO_BORDER_SET, children: [new Paragraph({ text: '', spacing: { before: 800 } })] }),
            new TableCell({ borders: NO_BORDER_SET, children: [new Paragraph({ text: '', spacing: { before: 800 } })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ borders: NO_BORDER_SET, children: [makeParagraph('_______________________', {})] }),
            new TableCell({ borders: NO_BORDER_SET, children: [makeParagraph('_______________________', {})] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ borders: NO_BORDER_SET, children: [makeParagraph('NIP.')] }),
            new TableCell({ borders: NO_BORDER_SET, children: [makeParagraph('NIP.')] }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
  );

  // 7. Penutup
  sections.push(
    makeHeading1('7. Penutup'),
    makeParagraph(
      `Status dokumen: ${report.report_approval_gate.document_status_label}. ${report.report_approval_gate.closing_note}`,
    ),
  );

  // 7. Pengesahan
  const penandatangan = officials?.penandatangan_laporan;

  sections.push(
    makeHeading1('8. Pengesahan'),
    makeParagraph(
      `Sofifi, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    ),
    makeParagraph(safeText(penandatangan?.jabatan, 'Jabatan Belum Diisi')),
    new Paragraph({ text: '', spacing: { before: 800 } }),
    makeParagraph(safeText(penandatangan?.nama, 'Nama Belum Diisi'), { bold: true }),
    makeParagraph(penandatangan?.nip ? `NIP. ${penandatangan.nip}` : 'NIP. Belum Diisi'),
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

  const filenameOpd = (scope.nama_opd || 'SeluruhOPD').replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `Laporan_Pemantauan_TLHP_${filenameOpd}_${scope.tahun}${draft ? '_DRAFT' : ''}.docx`;

  return { buffer, filename, report };
};

module.exports = {
  buildTlhpWordDocument,
};
