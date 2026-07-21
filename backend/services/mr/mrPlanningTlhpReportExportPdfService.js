// backend/services/mr/mrPlanningTlhpReportExportPdfService.js

"use strict";

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const reportExportWordService = require("./mrPlanningTlhpReportExportWordService");

const execFileAsync = promisify(execFile);

const createPdfError = (message, statusCode = 500, code = "MR_TLHP_REPORT_PDF_ERROR", details = {}) => {
  const error = new Error(message);
  error.status = statusCode;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

const getLibreOfficeCommandCandidates = () => {
  const configuredPath = process.env.LIBREOFFICE_PATH;

  return [
    configuredPath,
    "soffice",
    "libreoffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ].filter(Boolean);
};

const convertDocxToPdf = async ({ docxPath, outputDir }) => {
  const candidates = getLibreOfficeCommandCandidates();
  const errors = [];

  for (const command of candidates) {
    try {
      await execFileAsync(
        command,
        ["--headless", "--nologo", "--nofirststartwizard", "--convert-to", "pdf", "--outdir", outputDir, docxPath],
        { windowsHide: true, timeout: 120000 },
      );

      return;
    } catch (error) {
      errors.push({ command, message: error.message, code: error.code, stderr: error.stderr });

      if (error.code !== "ENOENT") {
        throw createPdfError("Konversi DOCX ke PDF gagal.", 500, "MR_TLHP_REPORT_PDF_CONVERSION_FAILED", {
          command,
          message: error.message,
          stderr: error.stderr,
        });
      }
    }
  }

  throw createPdfError(
    "LibreOffice tidak ditemukan. Install LibreOffice atau set LIBREOFFICE_PATH pada file .env.",
    500,
    "MR_TLHP_REPORT_PDF_CONVERTER_NOT_FOUND",
    { attempted_commands: errors.map((item) => item.command), errors },
  );
};

const replaceDocxExtensionWithPdf = (filename = "") => {
  if (!filename) return "Laporan_Pemantauan_TLHP.pdf";
  if (filename.toLowerCase().endsWith(".docx")) return filename.replace(/\.docx$/i, ".pdf");
  return `${filename}.pdf`;
};

const buildTlhpPdfFromWord = async (scopeParams) => {
  const tempRoot = path.join(os.tmpdir(), `mr-tlhp-pdf-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`);

  await fs.mkdir(tempRoot, { recursive: true });

  try {
    const { buffer: wordBuffer, filename: wordFilename, report } =
      await reportExportWordService.buildTlhpWordDocument(scopeParams);

    const safeWordFilename = wordFilename || "Laporan_Pemantauan_TLHP.docx";
    const pdfFilename = replaceDocxExtensionWithPdf(safeWordFilename);

    const docxPath = path.join(tempRoot, safeWordFilename);
    const expectedPdfPath = path.join(tempRoot, pdfFilename);

    await fs.writeFile(docxPath, wordBuffer);
    await convertDocxToPdf({ docxPath, outputDir: tempRoot });

    let pdfBuffer;

    try {
      pdfBuffer = await fs.readFile(expectedPdfPath);
    } catch (error) {
      const files = await fs.readdir(tempRoot);
      const pdfFile = files.find((file) => file.toLowerCase().endsWith(".pdf"));

      if (!pdfFile) {
        throw createPdfError("File PDF hasil konversi tidak ditemukan.", 500, "MR_TLHP_REPORT_PDF_OUTPUT_NOT_FOUND", {
          expected_pdf_path: expectedPdfPath,
          files,
        });
      }

      pdfBuffer = await fs.readFile(path.join(tempRoot, pdfFile));
    }

    return {
      buffer: pdfBuffer,
      filename: pdfFilename,
      report,
    };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
};

module.exports = {
  buildTlhpPdfFromWord,
};
