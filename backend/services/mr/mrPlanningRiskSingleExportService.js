// backend/services/mr/mrPlanningRiskSingleExportService.js
'use strict';

const {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = require('docx');
const ExcelJS = require('exceljs');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const db = require('../../models');
const {
  MrPlanningRisk,
  MrPlanningMitigation,
  MrPlanningMonitoring,
  MrPlanningRootCause,
  MrPlanningContext,
} = db;

const execFileAsync = promisify(execFile);

const safeText = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const createExportError = (message, statusCode = 500, code = 'MR_RISK_SINGLE_EXPORT_ERROR') => {
  const error = new Error(message);
  error.status = statusCode;
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const assertRiskId = (riskId) => {
  const id = Number(riskId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createExportError('ID Risiko tidak valid.', 400, 'MR_RISK_SINGLE_EXPORT_INVALID_ID');
  }
  return id;
};

const getSingleRiskData = async (riskId) => {
  const id = assertRiskId(riskId);

  const risk = await MrPlanningRisk.findByPk(id, {
    include: [{ model: MrPlanningContext, as: 'context', required: false }],
  });

  if (!risk) {
    throw createExportError('Risiko tidak ditemukan.', 404, 'MR_RISK_SINGLE_EXPORT_NOT_FOUND');
  }

  const riskPlain = risk.toJSON ? risk.toJSON() : risk;

  const [rootCauses, mitigations, monitorings] = await Promise.all([
    MrPlanningRootCause.findAll({
      where: { mr_planning_risk_id: id },
      order: [
        ['prioritas_penyebab', 'ASC'],
        ['id', 'ASC'],
      ],
    }),
    MrPlanningMitigation.findAll({
      where: { mr_planning_risk_id: id },
      order: [['id', 'ASC']],
    }),
    MrPlanningMonitoring.findAll({
      where: { mr_planning_risk_id: id },
      order: [
        ['periode_awal', 'ASC'],
        ['id', 'ASC'],
      ],
    }),
  ]);

  return {
    risk: riskPlain,
    rootCauses: rootCauses.map((r) => (r.toJSON ? r.toJSON() : r)),
    mitigations: mitigations.map((m) => (m.toJSON ? m.toJSON() : m)),
    monitorings: monitorings.map((m) => (m.toJSON ? m.toJSON() : m)),
  };
};

const buildFilename = (risk, ext) => {
  const kode = safeText(risk?.kode_risiko, `risiko-${risk?.id}`);
  const safeKode = String(kode).replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `Laporan_MR_Risiko_${safeKode}.${ext}`;
};

// --- WORD ---------------------------------------------------------------

const buildHeading = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true })],
  });

const buildLabelValueRow = (label, value) =>
  new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: safeText(value) })] })],
      }),
    ],
  });

const buildInfoTable = (rows) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => buildLabelValueRow(label, value)),
  });

const buildWordDocument = async (riskId) => {
  const { risk, rootCauses, mitigations, monitorings } = await getSingleRiskData(riskId);

  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'LAPORAN RISIKO', bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: safeText(risk?.nama_risiko) })],
    }),
    buildHeading('Identitas Risiko'),
    buildInfoTable([
      ['Kode Risiko', risk?.kode_risiko],
      ['Nama/Uraian Risiko', risk?.nama_risiko],
      ['Objek Risiko', risk?.objek_risiko],
      ['Penyebab Risiko', risk?.penyebab_risiko],
      ['Dampak Risiko', risk?.dampak_risiko],
      ['Skor Risiko', risk?.skor_risiko],
      ['Level Risiko', risk?.level_risiko],
      ['Status', risk?.status_revisi],
      ['OPD', risk?.context?.nama_opd],
      ['Tahun', risk?.context?.tahun],
    ]),
  ];

  if (rootCauses.length) {
    children.push(buildHeading('Analisis Akar Penyebab (Root Cause)'));
    rootCauses.forEach((rc, index) => {
      children.push(
        buildInfoTable([
          [`Penyebab #${index + 1}`, rc.uraian_penyebab],
          ['Akar Penyebab', rc.akar_penyebab],
          ['Rekomendasi Pengendalian', rc.rekomendasi_pengendalian],
        ]),
      );
    });
  }

  if (mitigations.length) {
    children.push(buildHeading('Rencana Tindak Pengendalian (Mitigasi)'));
    mitigations.forEach((m, index) => {
      children.push(
        buildInfoTable([
          [`Mitigasi #${index + 1}`, m.uraian_mitigasi],
          ['Kegiatan Pengendalian', m.kegiatan_pengendalian],
          ['Penanggung Jawab', m.penanggung_jawab],
          ['Target Waktu Mulai', m.target_waktu_mulai],
          ['Target Waktu Selesai', m.target_waktu_selesai],
          ['Status Mitigasi', m.status_mitigasi],
          ['Progress (%)', m.progress_persen],
        ]),
      );
    });
  }

  if (monitorings.length) {
    children.push(buildHeading('Pemantauan / Realisasi Pengendalian'));
    monitorings.forEach((mo, index) => {
      children.push(
        buildInfoTable([
          [`Pemantauan #${index + 1}`, mo.periode_label],
          ['Realisasi Mitigasi', mo.realisasi_mitigasi],
          ['Persentase Realisasi (%)', mo.persentase_realisasi],
          ['Hambatan/Kendala', mo.kendala || mo.hambatan],
          ['Tindak Lanjut', mo.tindak_lanjut],
          ['Status Monitoring', mo.status_monitoring],
        ]),
      );
    });
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(doc);
  const filename = buildFilename(risk, 'docx');

  return { buffer, filename, risk };
};

// --- EXCEL ----------------------------------------------------------------

const buildExcelWorkbook = async (riskId) => {
  const { risk, rootCauses, mitigations, monitorings } = await getSingleRiskData(riskId);

  const workbook = new ExcelJS.Workbook();

  const infoSheet = workbook.addWorksheet('Identitas Risiko');
  infoSheet.columns = [
    { header: 'Field', key: 'field', width: 30 },
    { header: 'Nilai', key: 'value', width: 60 },
  ];
  [
    ['Kode Risiko', risk?.kode_risiko],
    ['Nama/Uraian Risiko', risk?.nama_risiko],
    ['Objek Risiko', risk?.objek_risiko],
    ['Penyebab Risiko', risk?.penyebab_risiko],
    ['Dampak Risiko', risk?.dampak_risiko],
    ['Skor Risiko', risk?.skor_risiko],
    ['Level Risiko', risk?.level_risiko],
    ['Status', risk?.status_revisi],
    ['OPD', risk?.context?.nama_opd],
    ['Tahun', risk?.context?.tahun],
  ].forEach(([field, value]) => infoSheet.addRow({ field, value: safeText(value) }));

  const rootCauseSheet = workbook.addWorksheet('Root Cause');
  rootCauseSheet.columns = [
    { header: 'Uraian Penyebab', key: 'uraian_penyebab', width: 40 },
    { header: 'Akar Penyebab', key: 'akar_penyebab', width: 40 },
    { header: 'Rekomendasi Pengendalian', key: 'rekomendasi_pengendalian', width: 40 },
  ];
  rootCauses.forEach((rc) => rootCauseSheet.addRow(rc));

  const mitigationSheet = workbook.addWorksheet('Mitigasi');
  mitigationSheet.columns = [
    { header: 'Uraian Mitigasi', key: 'uraian_mitigasi', width: 40 },
    { header: 'Kegiatan Pengendalian', key: 'kegiatan_pengendalian', width: 40 },
    { header: 'Penanggung Jawab', key: 'penanggung_jawab', width: 25 },
    { header: 'Target Mulai', key: 'target_waktu_mulai', width: 18 },
    { header: 'Target Selesai', key: 'target_waktu_selesai', width: 18 },
    { header: 'Status', key: 'status_mitigasi', width: 18 },
    { header: 'Progress (%)', key: 'progress_persen', width: 14 },
  ];
  mitigations.forEach((m) => mitigationSheet.addRow(m));

  const monitoringSheet = workbook.addWorksheet('Pemantauan');
  monitoringSheet.columns = [
    { header: 'Periode', key: 'periode_label', width: 20 },
    { header: 'Realisasi Mitigasi', key: 'realisasi_mitigasi', width: 40 },
    { header: 'Persentase Realisasi (%)', key: 'persentase_realisasi', width: 20 },
    { header: 'Kendala', key: 'kendala', width: 30 },
    { header: 'Tindak Lanjut', key: 'tindak_lanjut', width: 30 },
    { header: 'Status Monitoring', key: 'status_monitoring', width: 18 },
  ];
  monitorings.forEach((mo) => monitoringSheet.addRow(mo));

  const filename = buildFilename(risk, 'xlsx');

  return { workbook, filename, risk };
};

// --- PDF (konversi dari Word via LibreOffice) ------------------------------

const getLibreOfficeCommandCandidates = () => {
  const configuredPath = process.env.LIBREOFFICE_PATH;
  return [
    configuredPath,
    'soffice',
    'libreoffice',
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ].filter(Boolean);
};

const convertDocxToPdf = async ({ docxPath, outputDir }) => {
  const candidates = getLibreOfficeCommandCandidates();

  for (const command of candidates) {
    try {
      await execFileAsync(
        command,
        [
          '--headless',
          '--nologo',
          '--nofirststartwizard',
          '--convert-to',
          'pdf',
          '--outdir',
          outputDir,
          docxPath,
        ],
        { windowsHide: true, timeout: 120000 },
      );
      return;
    } catch (error) {
      // coba kandidat berikutnya
    }
  }

  throw createExportError(
    'Konversi PDF gagal. Pastikan LibreOffice terpasang di server.',
    500,
    'MR_RISK_SINGLE_EXPORT_PDF_CONVERT_FAILED',
  );
};

const replaceDocxExtensionWithPdf = (filename) => filename.replace(/\.docx$/i, '.pdf');

const buildPdfFromWord = async (riskId) => {
  const tempRoot = path.join(
    os.tmpdir(),
    `mr-risk-pdf-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`,
  );
  await fs.mkdir(tempRoot, { recursive: true });

  try {
    const { buffer: wordBuffer, filename: wordFilename, risk } = await buildWordDocument(riskId);

    const pdfFilename = replaceDocxExtensionWithPdf(wordFilename);
    const docxPath = path.join(tempRoot, wordFilename);
    const expectedPdfPath = path.join(tempRoot, pdfFilename);

    await fs.writeFile(docxPath, wordBuffer);
    await convertDocxToPdf({ docxPath, outputDir: tempRoot });

    let pdfBuffer;
    try {
      pdfBuffer = await fs.readFile(expectedPdfPath);
    } catch (error) {
      const files = await fs.readdir(tempRoot);
      const pdfFile = files.find((file) => file.toLowerCase().endsWith('.pdf'));
      if (!pdfFile) {
        throw createExportError(
          'File PDF hasil konversi tidak ditemukan.',
          500,
          'MR_RISK_SINGLE_EXPORT_PDF_OUTPUT_NOT_FOUND',
        );
      }
      pdfBuffer = await fs.readFile(path.join(tempRoot, pdfFile));
    }

    return { buffer: pdfBuffer, filename: pdfFilename, risk };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
};

module.exports = {
  getSingleRiskData,
  buildWordDocument,
  buildExcelWorkbook,
  buildPdfFromWord,
};
