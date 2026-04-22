/**
 * Hapus + isi ulang hanya tabel apbd_proyeksi_2026_2030 untuk periode RPJMD aktif (2025–2029).
 * NODE_ENV=development
 */
"use strict";

const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { parseTable229 } = require("../helpers/rpjmdMalutPdfParsers");
const {
  DEFAULT_PDF,
  loadRpjmdMalutPdfDocument,
  buildMalutRpjmdTableTextsFromPdf,
} = require("../helpers/rpjmdMalutPdfGeometryExtract");

async function resolvePeriodeId(transaction) {
  let rows = await sequelize.query(
    `SELECT id FROM periode_rpjmds WHERE tahun_awal = 2025 AND tahun_akhir = 2029 LIMIT 1`,
    { type: QueryTypes.SELECT, transaction },
  );
  if (rows[0]?.id) return rows[0].id;
  rows = await sequelize.query(
    `SELECT id FROM periode_rpjmds WHERE tahun_awal <= 2029 AND tahun_akhir >= 2025 ORDER BY tahun_awal DESC LIMIT 1`,
    { type: QueryTypes.SELECT, transaction },
  );
  if (rows[0]?.id) return rows[0].id;
  throw new Error("periode_rpjmd tidak ditemukan");
}

async function bulkInsertApbd(rows, periodeId, transaction) {
  if (!rows.length) return 0;
  const cols = [
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
  const CHUNK = 100;
  let n = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = rows.slice(i, i + CHUNK).map((r) => ({ ...r, periode_rpjmd_id: periodeId }));
    const placeholders = part.map(() => `(${cols.map(() => "?").join(",")})`).join(",");
    const flat = part.flatMap((r) => cols.map((c) => r[c] ?? null));
    const sql = `INSERT INTO \`apbd_proyeksi_2026_2030\` (${cols.map((c) => "`" + c + "`").join(",")}) VALUES ${placeholders}`;
    await sequelize.query(sql, { replacements: flat, transaction });
    n += part.length;
  }
  return n;
}

(async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("development only");
    process.exit(1);
  }
  const pdfPath = process.env.RPJMD_PDF_PATH || DEFAULT_PDF;
  const doc = await loadRpjmdMalutPdfDocument(pdfPath);
  const texts = await buildMalutRpjmdTableTextsFromPdf(doc, pdfPath);
  const apbd = parseTable229(texts.table229);
  const row = apbd.find((r) => r.kode_baris === "3.2.1");
  console.log("PARSED_3.2.1:", JSON.stringify(row, null, 2));

  await sequelize.transaction(async (t) => {
    const pid = await resolvePeriodeId(t);
    await sequelize.query(`DELETE FROM apbd_proyeksi_2026_2030 WHERE periode_rpjmd_id = :pid`, {
      replacements: { pid },
      transaction: t,
    });
    const n = await bulkInsertApbd(apbd, pid, t);
    console.log(JSON.stringify({ periode_rpjmd_id: pid, inserted: n }, null, 2));
    const dbRow = await sequelize.query(
      `SELECT kode_baris, uraian, target_2025, proyeksi_2026, proyeksi_2027, proyeksi_2028, proyeksi_2029, proyeksi_2030
       FROM apbd_proyeksi_2026_2030 WHERE periode_rpjmd_id = :pid AND kode_baris = '3.2.1' LIMIT 1`,
      { replacements: { pid }, type: QueryTypes.SELECT, transaction: t },
    );
    console.log("DB_3.2.1:", JSON.stringify(dbRow[0], null, 2));
  });
  await sequelize.close();
})().catch((e) => {
  console.error(e);
  sequelize.close();
  process.exit(1);
});
