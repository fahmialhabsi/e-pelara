"use strict";
/**
 * Verifikasi document engine: generate 4 keluaran resmi + ringkasan konteks DB.
 * Jalankan: node scripts/verifyOfficialDocuments.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const db = require("../models");
const engine = require("../services/planningOfficialDocumentEngine");
const { Op } = require("sequelize");

const outDir = path.join(__dirname, "../storage/document-verify");
const { RenjaDokumen, RkpdDokumen, PerangkatDaerah } = db;

async function pickRenjaId() {
  const rows = await RenjaDokumen.findAll({
    attributes: ["id", "judul", "tahun", "perangkat_daerah_id"],
    include: [
      {
        model: PerangkatDaerah,
        as: "perangkatDaerah",
        required: true,
        where: { [Op.or]: [{ is_test: false }, { is_test: null }] },
        attributes: ["id", "nama", "kode", "is_test"],
      },
    ],
    where: {
      judul: { [Op.notLike]: "%Smoke%" },
    },
    order: [["id", "DESC"]],
    limit: 5,
  });
  const ok = rows.find((r) => !/api test|smoke/i.test(String(r.judul || "")));
  return ok || rows[0] || null;
}

async function pickRkpdId() {
  const rows = await RkpdDokumen.findAll({
    where: {
      [Op.and]: [
        { [Op.or]: [{ is_test: false }, { is_test: null }] },
        { judul: { [Op.notLike]: "%Smoke%" } },
      ],
    },
    order: [["id", "DESC"]],
    limit: 5,
  });
  return rows[0] || null;
}

function extractDocxText(docxPath) {
  const tmp = path.join(outDir, "_extract");
  if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true });
  fs.mkdirSync(tmp, { recursive: true });
  const zipPath = path.join(tmp, "x.zip");
  fs.copyFileSync(docxPath, zipPath);
  try {
    execSync(`tar -xf "${zipPath}" -C "${tmp}"`, { stdio: "pipe", shell: true });
  } catch {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tmp}' -Force"`,
      { stdio: "pipe" },
    );
  }
  const xmlPath = path.join(tmp, "word", "document.xml");
  if (!fs.existsSync(xmlPath)) return "(tidak bisa ekstrak word/document.xml)";
  let xml = fs.readFileSync(xmlPath, "utf8");
  xml = xml.replace(/<w:tab[^/]*\/>/g, "\t");
  xml = xml.replace(/<\/w:p>/g, "\n");
  xml = xml.replace(/<w:br[^/]*\/>/g, "\n");
  xml = xml.replace(/<[^>]+>/g, "");
  xml = xml
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  return xml.slice(0, 12000);
}

function pdfTextHint(buf) {
  const s = buf.toString("binary");
  const chunks = s.match(/\(([^)]+)\)/g) || [];
  const text = chunks
    .map((c) => c.slice(1, -1))
    .filter((t) => /[a-zA-ZÀ-ÿ]{3,}/.test(t) && !/^[\d\s]+$/.test(t))
    .join(" ")
    .replace(/\\[rn]/g, " ");
  return text.slice(0, 4000);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const renjaRow = await pickRenjaId();
  const rkpdRow = await pickRkpdId();
  const report = {
    root: path.resolve(__dirname, "../.."),
    outDir,
    renja: renjaRow ? { id: renjaRow.id, judul: renjaRow.judul } : null,
    rkpd: rkpdRow ? { id: rkpdRow.id, judul: rkpdRow.judul } : null,
    files: [],
    docxText: {},
    pdfHint: {},
    contextRenja: null,
    contextRkpd: null,
  };

  if (!renjaRow) {
    console.error("Tidak ada renja_dokumen non-smoke untuk diuji.");
  } else {
    const rid = renjaRow.id;
    report.contextRenja = await engine.loadRenjaOfficialContext(db, rid);
    const docx = await engine.buildRenjaOpdOfficialDocx(db, rid);
    const pdf = await engine.buildRenjaOpdOfficialPdf(db, rid);
    const pDocx = path.join(outDir, `verify-renja-resmi-${rid}.docx`);
    const pPdf = path.join(outDir, `verify-renja-resmi-${rid}.pdf`);
    fs.writeFileSync(pDocx, docx);
    fs.writeFileSync(pPdf, pdf);
    report.files.push({ kind: "renja-docx", path: pDocx, bytes: docx.length });
    report.files.push({ kind: "renja-pdf", path: pPdf, bytes: pdf.length });
    report.docxText.renja = extractDocxText(pDocx);
    report.pdfHint.renja = pdfTextHint(pdf);
  }

  if (!rkpdRow) {
    console.error("Tidak ada rkpd_dokumen non-smoke untuk diuji.");
  } else {
    const kid = rkpdRow.id;
    report.contextRkpd = await engine.loadRkpdOfficialContext(db, kid);
    const docx = await engine.buildRkpdOfficialDocx(db, kid);
    const pdf = await engine.buildRkpdOfficialPdf(db, kid);
    const pDocx = path.join(outDir, `verify-rkpd-resmi-${kid}.docx`);
    const pPdf = path.join(outDir, `verify-rkpd-resmi-${kid}.pdf`);
    fs.writeFileSync(pDocx, docx);
    fs.writeFileSync(pPdf, pdf);
    report.files.push({ kind: "rkpd-docx", path: pDocx, bytes: docx.length });
    report.files.push({ kind: "rkpd-pdf", path: pPdf, bytes: pdf.length });
    report.docxText.rkpd = extractDocxText(pDocx);
    report.pdfHint.rkpd = pdfTextHint(pdf);
  }

  fs.writeFileSync(path.join(outDir, "verify-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
