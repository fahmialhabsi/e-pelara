"use strict";
const { sequelize } = require("../models");

const q = async (sql) =>
  (await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT }));

(async () => {
  const dbRow = await q("SELECT DATABASE() AS d");
  const db = dbRow[0].d;
  const tables = await q(`
    SELECT TABLE_NAME FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = '${db}' AND TABLE_NAME IN (
      'perangkat_daerah','rpjmd_dokumen','renstra_pd_dokumen','rkpd_dokumen','rkpd_item',
      'renja_dokumen','renja_item','renja_rkpd_item_map'
    ) ORDER BY TABLE_NAME
  `);
  console.log("--- TABLES ---");
  console.log(JSON.stringify(tables, null, 2));

  const fks = await q(`
    SELECT k.TABLE_NAME, k.CONSTRAINT_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE k
    WHERE k.TABLE_SCHEMA = '${db}' 
    AND k.REFERENCED_TABLE_NAME IS NOT NULL
    AND k.TABLE_NAME IN ('perangkat_daerah','rpjmd_dokumen','renstra_pd_dokumen','rkpd_dokumen','rkpd_item','renja_dokumen','renja_item','renja_rkpd_item_map')
    ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.COLUMN_NAME
  `);
  console.log("--- FOREIGN KEYS ---");
  console.log(JSON.stringify(fks, null, 2));

  const uniq = await q(`
    SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = '${db}' 
    AND TABLE_NAME IN ('perangkat_daerah','rpjmd_dokumen','renstra_pd_dokumen','rkpd_dokumen','rkpd_item','renja_dokumen','renja_item','renja_rkpd_item_map')
    AND INDEX_NAME != 'PRIMARY'
    GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
    ORDER BY TABLE_NAME, INDEX_NAME
  `);
  console.log("--- INDEXES (non-PK) ---");
  console.log(JSON.stringify(uniq, null, 2));

  const cols = await q(`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = '${db}' 
    AND TABLE_NAME IN ('rkpd_dokumen','renja_dokumen')
    AND COLUMN_NAME = 'is_final_active'
  `);
  console.log("--- is_final_active columns ---");
  console.log(JSON.stringify(cols, null, 2));

  await sequelize.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
