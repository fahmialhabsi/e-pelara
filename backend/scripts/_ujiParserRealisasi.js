"use strict";
const fs = require("fs");
const { parseSipdRealisasiPdf } = require("../services/realisasiSipdPdfImportService");

(async () => {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/_ujiParserRealisasi.js <path-ke-pdf>");
    process.exit(1);
  }
  const buffer = fs.readFileSync(path);
  const result = await parseSipdRealisasiPdf(buffer);
  console.log(JSON.stringify(result, null, 2));
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
