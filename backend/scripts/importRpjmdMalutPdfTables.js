/**
 * Impor tabel RPJMD Malut 2025–2029 dari file PDF asli ke tabel khusus impor.
 *
 * Prasyarat:
 * - NODE_ENV=development (default)
 * - Migrasi 20260430160000-create-rpjmd-malut-pdf-import-tables sudah dijalankan
 * - File PDF: dokumenEPelara/Rankhir RPJMD Prov. Malut Tahun 2025-2029 - 28072025.pdf
 *   (override: RPJMD_PDF_PATH=... )
 * - pdf-parse (untuk 2.28 & 3.1) + pdfjs-dist (untuk 2.29, 3.3, 4.2)
 *
 * Fallback opsional teks dump (bukan sumber utama):
 * - RPJMD_IMPORT_USE_DUMP=1 dan scripts/rpjmd_malut_pdf_dump.txt ada → seluruh tabel dari dump.
 *
 * Penggunaan: node scripts/importRpjmdMalutPdfTables.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const {
  parseTable228,
  parseTable229,
  parseTable31,
  parseArahKebijakan,
  parseIKU,
} = require("../helpers/rpjmdMalutPdfParsers");
const {
  DEFAULT_PDF,
  loadRpjmdMalutPdfDocument,
  buildMalutRpjmdTableTextsFromPdf,
} = require("../helpers/rpjmdMalutPdfGeometryExtract");

const DUMP = path.join(__dirname, "rpjmd_malut_pdf_dump.txt");

function loadDumpText() {
  if (!fs.existsSync(DUMP)) {
    throw new Error("File dump tidak ada.");
  }
  return fs.readFileSync(DUMP, "utf8");
}

async function resolvePeriodeId(transaction) {
  let rows = await sequelize.query(
    `SELECT id FROM periode_rpjmds WHERE tahun_awal = 2025 AND tahun_akhir = 2029 LIMIT 1`,
    { type: QueryTypes.SELECT, transaction },
  );
  if (rows[0] && rows[0].id) return rows[0].id;
  rows = await sequelize.query(
    `SELECT id FROM periode_rpjmds WHERE tahun_awal <= 2029 AND tahun_akhir >= 2025 ORDER BY tahun_awal DESC LIMIT 1`,
    { type: QueryTypes.SELECT, transaction },
  );
  if (rows[0] && rows[0].id) return rows[0].id;
  throw new Error(
    "Tidak ada baris periode_rpjmds untuk 2025–2029. Buat periode di DB lalu jalankan ulang.",
  );
}

async function clearPeriode(periodeId, transaction) {
  for (const t of [
    "iku_rpjmd",
    "arah_kebijakan_rpjmd",
    "rpjmd_target_tujuan_sasaran_2025_2029",
    "apbd_proyeksi_2026_2030",
    "urusan_kinerja_2021_2024",
  ]) {
    await sequelize.query(`DELETE FROM \`${t}\` WHERE periode_rpjmd_id = :pid`, {
      replacements: { pid: periodeId },
      transaction,
    });
  }
}

async function bulkInsert(table, cols, rows, transaction) {
  if (!rows.length) return 0;
  const CHUNK = 100;
  let n = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = rows.slice(i, i + CHUNK);
    const placeholders = part.map(() => `(${cols.map(() => "?").join(",")})`).join(",");
    const flat = part.flatMap((r) => cols.map((c) => r[c] ?? null));
    const sql = `INSERT INTO \`${table}\` (${cols.map((c) => "`" + c + "`").join(",")}) VALUES ${placeholders}`;
    await sequelize.query(sql, { replacements: flat, transaction });
    n += part.length;
  }
  return n;
}

async function loadParsedRowsFromPdf(pdfPath) {
  const doc = await loadRpjmdMalutPdfDocument(pdfPath);
  const texts = await buildMalutRpjmdTableTextsFromPdf(doc, pdfPath);
  return {
    meta: {
      pdfPath,
      table228Method: texts.table228Method,
      table31Method: texts.table31Method,
    },
    apbd: parseTable229(texts.table229),
    u228: parseTable228(texts.table228),
    tgt: parseTable31(texts.table31),
    arah: parseArahKebijakan(texts.table33),
    iku: parseIKU(texts.table42),
  };
}

async function loadParsedRowsFromDump(fullText) {
  return {
    meta: { source: "rpjmd_malut_pdf_dump.txt" },
    apbd: parseTable229(fullText),
    u228: parseTable228(fullText),
    tgt: parseTable31(fullText),
    arah: parseArahKebijakan(fullText),
    iku: parseIKU(fullText),
  };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Hanya untuk development. Set NODE_ENV=development.");
    process.exit(1);
  }
  const pdfPath = process.env.RPJMD_PDF_PATH || DEFAULT_PDF;
  if (!fs.existsSync(pdfPath)) {
    console.error("PDF tidak ditemukan:", pdfPath);
    process.exit(1);
  }

  const parsed =
    process.env.RPJMD_IMPORT_USE_DUMP === "1"
      ? await loadParsedRowsFromDump(loadDumpText())
      : await loadParsedRowsFromPdf(pdfPath);

  await sequelize.transaction(async (t) => {
    const periodeId = await resolvePeriodeId(t);
    await clearPeriode(periodeId, t);

    const apbd = parsed.apbd.map((r) => ({ ...r, periode_rpjmd_id: periodeId }));
    const u228 = parsed.u228.map((r) => ({ ...r, periode_rpjmd_id: periodeId }));
    const tgt = parsed.tgt.map((r) => ({ ...r, periode_rpjmd_id: periodeId }));
    const arah = parsed.arah.map((r) => ({ ...r, periode_rpjmd_id: periodeId }));
    const iku = parsed.iku.map((r) => ({ ...r, periode_rpjmd_id: periodeId }));

    const cU = [
      "periode_rpjmd_id",
      "bidang_urusan",
      "no_urut",
      "indikator",
      "tahun_2021",
      "tahun_2022",
      "tahun_2023",
      "tahun_2024",
      "satuan",
    ];
    const cA = [
      "periode_rpjmd_id",
      "kode_baris",
      "uraian",
      "target_2025",
      "proyeksi_2026",
      "proyeksi_2027",
      "proyeksi_2028",
      "proyeksi_2029",
      "proyeksi_2030",
    ];
    const cT = [
      "periode_rpjmd_id",
      "urutan",
      "tujuan",
      "sasaran",
      "indikator",
      "baseline_2024",
      "target_2025",
      "target_2026",
      "target_2027",
      "target_2028",
      "target_2029",
      "target_2030",
      "ket",
    ];
    const cAr = ["periode_rpjmd_id", "no_misi", "misi_ringkas", "arah_kebijakan"];
    const cIk = [
      "periode_rpjmd_id",
      "no_urut",
      "indikator",
      "baseline_2024",
      "target_2025",
      "target_2026",
      "target_2027",
      "target_2028",
      "target_2029",
      "target_2030",
    ];

    const nu = await bulkInsert("urusan_kinerja_2021_2024", cU, u228, t);
    const na = await bulkInsert("apbd_proyeksi_2026_2030", cA, apbd, t);
    const nt = await bulkInsert("rpjmd_target_tujuan_sasaran_2025_2029", cT, tgt, t);
    const nr = await bulkInsert("arah_kebijakan_rpjmd", cAr, arah, t);
    const ni = await bulkInsert("iku_rpjmd", cIk, iku, t);

    console.log(
      JSON.stringify(
        {
          ...parsed.meta,
          periode_rpjmd_id: periodeId,
          urusan_kinerja_2021_2024: nu,
          apbd_proyeksi_2026_2030: na,
          rpjmd_target_tujuan_sasaran_2025_2029: nt,
          arah_kebijakan_rpjmd: nr,
          iku_rpjmd: ni,
        },
        null,
        2,
      ),
    );

    const su = await sequelize.query(
      `SELECT id, bidang_urusan, no_urut, LEFT(indikator,100) AS indikator FROM urusan_kinerja_2021_2024 WHERE periode_rpjmd_id = :pid ORDER BY id LIMIT 3`,
      { replacements: { pid: periodeId }, type: QueryTypes.SELECT, transaction: t },
    );
    const si = await sequelize.query(
      `SELECT id, no_urut, LEFT(indikator,100) AS indikator FROM iku_rpjmd WHERE periode_rpjmd_id = :pid ORDER BY id LIMIT 3`,
      { replacements: { pid: periodeId }, type: QueryTypes.SELECT, transaction: t },
    );
    console.log("sample urusan_kinerja_2021_2024:", su);
    console.log("sample iku_rpjmd:", si);
  });
}

main()
  .then(() => sequelize.close())
  .catch((e) => {
    console.error(e);
    sequelize.close();
    process.exit(1);
  });
