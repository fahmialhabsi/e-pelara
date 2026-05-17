// backend/helpers/mr/mrReportFilenameHelper.js

const MONTH_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const sanitizeFilenamePart = (value, fallback = "Tidak_Diketahui") => {
  const text = String(value || fallback)
    .trim()
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return text || fallback;
};

const formatDownloadDateId = (date = new Date()) => {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();

  const day = d.getDate();
  const month = MONTH_ID[d.getMonth()];
  const year = d.getFullYear();

  return `${day}_${month}_${year}`;
};

const getReportFilenameBase = (report = {}, options = {}) => {
  const context = report.context || {};
  const summary = report.summary || {};

  const namaOpd = sanitizeFilenamePart(
    context.nama_opd || summary.nama_opd,
    "OPD"
  );

  const downloadDate = formatDownloadDateId(options.date || new Date());

  return ["Laporan_MR_Terpadu", namaOpd, downloadDate].join("_");
};

const buildReportFilename = (report = {}, extension = "xlsx", options = {}) => {
  const normalizedExtension = String(extension || "xlsx")
    .replace(/^\./, "")
    .toLowerCase();

  return `${getReportFilenameBase(report, options)}.${normalizedExtension}`;
};

module.exports = {
  sanitizeFilenamePart,
  formatDownloadDateId,
  getReportFilenameBase,
  buildReportFilename,
};