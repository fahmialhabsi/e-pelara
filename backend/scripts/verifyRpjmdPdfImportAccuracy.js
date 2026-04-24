/**
 * Verifikasi impor RPJMD Malut: bandingkan jumlah baris DB vs manifest / parser PDF.
 *
 * NODE_ENV=development
 * node scripts/verifyRpjmdPdfImportAccuracy.js
 *
 * Opsional: RPJMD_PDF_PATH, PERIODE_RPJMD_ID (default: periode 2025–2029)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const manifest = require("../constants/rpjmdPdfTableManifest");
const {
  DEFAULT_PDF,
  loadRpjmdMalutPdfDocument,
  buildMalutRpjmdTableTextsFromPdf,
} = require("../helpers/rpjmdMalutPdfGeometryExtract");
const {
  parseTable228,
  parseTable229,
  parseTable31,
  parseArahKebijakan,
  parseIKU,
} = require("../helpers/rpjmdMalutPdfParsers");

async function resolvePeriodeId() {
  const pid = process.env.PERIODE_RPJMD_ID;
  if (pid && /^\d+$/.test(pid)) return parseInt(pid, 10);
  let rows = await sequelize.query(
    `SELECT id FROM periode_rpjmds WHERE tahun_awal = 2025 AND tahun_akhir = 2029 LIMIT 1`,
    { type: QueryTypes.SELECT },
  );
  if (rows[0]?.id) return rows[0].id;
  rows = await sequelize.query(
    `SELECT id FROM periode_rpjmds WHERE tahun_awal <= 2029 AND tahun_akhir >= 2025 ORDER BY tahun_awal DESC LIMIT 1`,
    { type: QueryTypes.SELECT },
  );
  return rows[0]?.id ?? null;
}

async function countDb(periodeId) {
  const sql = `
    SELECT 'urusan_kinerja_2021_2024' AS tbl, COUNT(*) AS c FROM urusan_kinerja_2021_2024 WHERE periode_rpjmd_id = :pid
    UNION ALL SELECT 'apbd_proyeksi_2026_2030', COUNT(*) FROM apbd_proyeksi_2026_2030 WHERE periode_rpjmd_id = :pid
    UNION ALL SELECT 'rpjmd_target_tujuan_sasaran_2025_2029', COUNT(*) FROM rpjmd_target_tujuan_sasaran_2025_2029 WHERE periode_rpjmd_id = :pid
    UNION ALL SELECT 'arah_kebijakan_rpjmd', COUNT(*) FROM arah_kebijakan_rpjmd WHERE periode_rpjmd_id = :pid
    UNION ALL SELECT 'iku_rpjmd', COUNT(*) FROM iku_rpjmd WHERE periode_rpjmd_id = :pid
  `;
  const rows = await sequelize.query(sql, {
    replacements: { pid: periodeId },
    type: QueryTypes.SELECT,
  });
  const m = {};
  for (const r of rows) m[r.tbl] = Number(r.c);
  return m;
}

async function parseFreshFromPdf(pdfPath) {
  const doc = await loadRpjmdMalutPdfDocument(pdfPath);
  const texts = await buildMalutRpjmdTableTextsFromPdf(doc, pdfPath);
  return {
    meta: { table228Method: texts.table228Method, table31Method: texts.table31Method },
    urusan_kinerja_2021_2024: parseTable228(texts.table228).length,
    apbd_proyeksi_2026_2030: parseTable229(texts.table229).length,
    rpjmd_target_tujuan_sasaran_2025_2029: parseTable31(texts.table31).length,
    arah_kebijakan_rpjmd: parseArahKebijakan(texts.table33).length,
    iku_rpjmd: parseIKU(texts.table42).length,
  };
}

async function fingerprintDb(periodeId) {
  const out = { apbd: [], iku: [] };
  for (const row of manifest.keyFingerprints.apbd_proyeksi_2026_2030) {
    const r = await sequelize.query(
      `SELECT kode_baris, uraian FROM apbd_proyeksi_2026_2030 WHERE periode_rpjmd_id = :pid AND kode_baris = :k LIMIT 1`,
      { replacements: { pid: periodeId, k: row.kode_baris }, type: QueryTypes.SELECT },
    );
    const u = r[0]?.uraian || "";
    out.apbd.push({
      kode_baris: row.kode_baris,
      ok: u.includes(row.uraianContains),
      uraianLeft: u.slice(0, 80),
    });
  }
  for (const row of manifest.keyFingerprints.iku_rpjmd) {
    const r = await sequelize.query(
      `SELECT no_urut, indikator FROM iku_rpjmd WHERE periode_rpjmd_id = :pid AND no_urut = :n LIMIT 1`,
      { replacements: { pid: periodeId, n: row.no_urut }, type: QueryTypes.SELECT },
    );
    const u = r[0]?.indikator || "";
    out.iku.push({
      no_urut: row.no_urut,
      ok: u.includes(row.indikatorContains),
      indikatorLeft: u.slice(0, 80),
    });
  }
  return out;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Hanya untuk development.");
    process.exit(1);
  }
  const pdfPath = process.env.RPJMD_PDF_PATH || path.join(__dirname, "..", "..", manifest.PDF_REL);
  if (!fs.existsSync(pdfPath)) {
    console.error("PDF tidak ada:", pdfPath);
    process.exit(1);
  }
  const periodeId = await resolvePeriodeId();
  if (!periodeId) {
    console.error("periode_rpjmd tidak ditemukan.");
    process.exit(1);
  }

  const dbCounts = await countDb(periodeId);
  const fresh = await parseFreshFromPdf(pdfPath);
  const fp = await fingerprintDb(periodeId);

  const tables = [
    "urusan_kinerja_2021_2024",
    "apbd_proyeksi_2026_2030",
    "rpjmd_target_tujuan_sasaran_2025_2029",
    "arah_kebijakan_rpjmd",
    "iku_rpjmd",
  ];

  const report = {
    pdfPath,
    periode_rpjmd_id: periodeId,
    manifestPageRanges: manifest.pageRanges,
    parserMeta: fresh.meta,
    rows: tables.map((tbl) => ({
      table: tbl,
      expected_manifest: manifest.expectedRowCounts[tbl],
      parsed_pdf_now: fresh[tbl],
      db: dbCounts[tbl],
      count_match_manifest: dbCounts[tbl] === manifest.expectedRowCounts[tbl],
      count_match_parser: dbCounts[tbl] === fresh[tbl],
    })),
    keyFingerprints: fp,
  };

  console.log(JSON.stringify(report, null, 2));

  const bad = report.rows.filter((r) => !r.count_match_manifest || !r.count_match_parser);
  if (bad.length) process.exitCode = 2;
}

main()
  .then(() => sequelize.close())
  .catch((e) => {
    console.error(e);
    sequelize.close();
    process.exit(1);
  });
