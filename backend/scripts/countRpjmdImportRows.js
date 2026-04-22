/**
 * Dev utility: row counts for RPJMD PDF import tables (all periods).
 * Usage: node scripts/countRpjmdImportRows.js
 */
const s = require("../config/database");
(async () => {
  const sql = `
    SELECT 'u' AS t, COUNT(*) AS c FROM urusan_kinerja_2021_2024
    UNION ALL SELECT 'a', COUNT(*) FROM apbd_proyeksi_2026_2030
    UNION ALL SELECT 't', COUNT(*) FROM rpjmd_target_tujuan_sasaran_2025_2029
    UNION ALL SELECT 'r', COUNT(*) FROM arah_kebijakan_rpjmd
    UNION ALL SELECT 'i', COUNT(*) FROM iku_rpjmd
  `;
  const r = await s.query(sql, { type: s.QueryTypes.SELECT });
  console.log(JSON.stringify(r, null, 2));
  await s.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
