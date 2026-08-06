'use strict';

const ExcelJS = require('exceljs');
const db = require('../../models');
const { ProsnError } = require('./prosnpWorkflowService');

const COLORS = {
  green: 'A8D5BA',
  greenDark: '276749',
  gold: 'C9A227',
  white: 'FFFFFF',
  pale: 'F3FAF5',
};
const statusLabels = {
  belum_diisi: 'Belum Diisi',
  dalam_pengisian: 'Dalam Pengisian',
  lengkap: 'Lengkap',
  perlu_perbaikan: 'Perlu Perbaikan',
  siap_diinput_prosn: 'Siap Diinput ProSN',
  diinput_manual: 'Diinput Manual',
  diarsipkan: 'Diarsipkan',
};

function title(ws, value, lastColumn) {
  ws.mergeCells(1, 1, 1, lastColumn);
  const cell = ws.getCell(1, 1);
  cell.value = value;
  cell.font = { bold: true, size: 16, color: { argb: COLORS.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenDark } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;
}
function tableHeader(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenDark } };
    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
  });
}
function finishSheet(ws) {
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.eachRow((row, index) => {
    if (index > 3) row.alignment = { vertical: 'top', wrapText: true };
  });
  ws.columns.forEach((column) => {
    column.width = Math.min(Math.max(column.width || 12, 12), 42);
  });
}

async function getDataset(periodeId, tenantId) {
  const periode = await db.ProsnPeriode.findOne({
    where: { id: periodeId, tenant_id: tenantId },
    include: [
      {
        model: db.ProsnIndikator,
        as: 'indikators',
        include: [{ model: db.ProsnPengisian, as: 'pengisian' }],
      },
    ],
    order: [[{ model: db.ProsnIndikator, as: 'indikators' }, 'urutan', 'ASC']],
  });
  if (!periode) throw new ProsnError('Periode ProSN tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
  return periode;
}

function addDetailSheet(workbook, periode, type, sheetName, columns, mapper) {
  const ws = workbook.addWorksheet(sheetName);
  title(ws, `ProSN e-Pelara - ${sheetName}`, columns.length);
  ws.addRow([`Periode: ${periode.nama} | Tahun: ${periode.tahun} | Semester: ${periode.semester}`]);
  ws.mergeCells(2, 1, 2, columns.length);
  ws.getCell(2, 1).font = { italic: true, color: { argb: COLORS.greenDark } };
  ws.addRow([]);
  ws.columns = columns.map((item) => ({ key: item.key, width: item.width || 18 }));
  ws.addRow(columns.map((item) => item.header));
  tableHeader(ws.getRow(4));
  periode.indikators
    .filter((item) => item.tipe_form === type)
    .forEach((item) => ws.addRow(mapper(item)));
  finishSheet(ws);
}

async function buildExcel(periodeId, tenantId) {
  const periode = await getDataset(periodeId, tenantId);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'e-Pelara';
  workbook.created = new Date();
  workbook.properties.title = `ProSN ${periode.tahun}`;

  const summary = workbook.addWorksheet('Ringkasan');
  title(summary, 'LAPORAN KERTAS KERJA PROSN', 6);
  summary.addRow(['Periode', periode.nama, 'Tahun', periode.tahun, 'Semester', periode.semester]);
  summary.addRow([]);
  summary.columns = [
    { key: 'kode', width: 14 },
    { key: 'nama', width: 40 },
    { key: 'tipe', width: 24 },
    { key: 'target', width: 16 },
    { key: 'realisasi', width: 16 },
    { key: 'status', width: 22 },
  ];
  summary.addRow(['Kode', 'Indikator', 'Tipe Form', 'Target', 'Realisasi', 'Status']);
  tableHeader(summary.getRow(4));
  periode.indikators.forEach((item) =>
    summary.addRow({
      kode: item.kode,
      nama: item.nama,
      tipe: item.tipe_form,
      target: item.pengisian?.target_nilai ?? null,
      realisasi: item.pengisian?.realisasi_nilai ?? null,
      status: statusLabels[item.pengisian?.status] || 'Belum Diisi',
    }),
  );
  finishSheet(summary);

  addDetailSheet(
    workbook,
    periode,
    'dukungan_program',
    'Dukungan Program',
    [
      { header: 'Kode', key: 'kode', width: 12 },
      { header: 'Indikator', key: 'nama', width: 34 },
      { header: 'Program', key: 'program', width: 28 },
      { header: 'Kegiatan', key: 'kegiatan', width: 28 },
      { header: 'Anggaran Target', key: 'target', width: 18 },
      { header: 'Anggaran Realisasi', key: 'realisasi', width: 18 },
      { header: 'Status', key: 'status', width: 20 },
    ],
    (item) => ({
      kode: item.kode,
      nama: item.nama,
      program: item.pengisian?.data_form?.program || '',
      kegiatan: item.pengisian?.data_form?.kegiatan || '',
      target: item.pengisian?.data_form?.anggaran_target ?? item.pengisian?.target_nilai ?? null,
      realisasi:
        item.pengisian?.data_form?.anggaran_realisasi ?? item.pengisian?.realisasi_nilai ?? null,
      status: statusLabels[item.pengisian?.status] || 'Belum Diisi',
    }),
  );
  addDetailSheet(
    workbook,
    periode,
    'target_capaian_rasio',
    'Target Capaian Rasio',
    [
      { header: 'Kode', key: 'kode', width: 12 },
      { header: 'Indikator', key: 'nama', width: 34 },
      { header: 'Target', key: 'target', width: 16 },
      { header: 'Realisasi', key: 'realisasi', width: 16 },
      { header: 'Rasio', key: 'rasio', width: 14 },
      { header: 'Pembilang', key: 'pembilang', width: 14 },
      { header: 'Penyebut', key: 'penyebut', width: 14 },
      { header: 'Status', key: 'status', width: 20 },
    ],
    (item) => ({
      kode: item.kode,
      nama: item.nama,
      target: item.pengisian?.target_nilai ?? null,
      realisasi: item.pengisian?.realisasi_nilai ?? null,
      rasio: item.pengisian?.rasio_nilai ?? null,
      pembilang: item.pengisian?.data_form?.pembilang ?? null,
      penyebut: item.pengisian?.data_form?.penyebut ?? null,
      status: statusLabels[item.pengisian?.status] || 'Belum Diisi',
    }),
  );
  addDetailSheet(
    workbook,
    periode,
    'distribusi_status',
    'Distribusi Status',
    [
      { header: 'Kode', key: 'kode', width: 12 },
      { header: 'Indikator', key: 'nama', width: 34 },
      { header: 'Kategori', key: 'kategori', width: 32 },
      { header: 'Total', key: 'total', width: 14 },
      { header: 'Status', key: 'status', width: 20 },
    ],
    (item) => ({
      kode: item.kode,
      nama: item.nama,
      kategori: JSON.stringify(item.pengisian?.data_form?.kategori || []),
      total: item.pengisian?.data_form?.total ?? null,
      status: statusLabels[item.pengisian?.status] || 'Belum Diisi',
    }),
  );

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `ProSN-${periode.tahun}-${periode.semester}-${periode.id}.xlsx`,
  };
}

module.exports = { buildExcel };
