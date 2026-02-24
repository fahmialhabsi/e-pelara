"use strict";
module.exports = {
  async up(queryInterface) {
    const safeAddIndex = async (table, column, indexName) => {
      try {
        await queryInterface.addIndex(table, [column], { name: indexName });
        console.log(`✅ Index ${indexName} added on ${table}`);
      } catch (e) {
        if (e.message.includes("Duplicate key name")) {
          console.warn(`⚠️ Index ${indexName} already exists on ${table}`);
        } else {
          console.error(
            `❌ Failed add index ${indexName} on ${table}:`,
            e.message
          );
        }
      }
    };

    const safeCreateUniqueIndex = async (table, indexName, columnsRaw) => {
      try {
        await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX ${indexName}
          ON \`${table}\` (${columnsRaw});
        `);
        console.log(`✅ Unique index ${indexName} created on ${table}`);
      } catch (e) {
        if (e.message.includes("Duplicate key name")) {
          console.warn(
            `⚠️ Unique index ${indexName} already exists on ${table}`
          );
        } else {
          console.error(
            `❌ Failed create unique index ${indexName} on ${table}:`,
            e.message
          );
        }
      }
    };

    // === prioritas_daerah ===
    await safeAddIndex(
      "prioritas_daerah",
      "periode_id",
      "idx_prioda_periode_id"
    );
    await safeAddIndex("prioritas_daerah", "tahun", "idx_prioda_tahun");
    await safeAddIndex(
      "prioritas_daerah",
      "jenis_dokumen",
      "idx_prioda_jenis_dokumen"
    );
    await safeCreateUniqueIndex(
      "prioritas_daerah",
      "unique_prioda_combination",
      `kode_prioda, uraian_prioda(100), jenis_dokumen(100), tahun, periode_id`
    );

    // === prioritas_kepala_daerah ===
    await safeAddIndex(
      "prioritas_kepala_daerah",
      "periode_id",
      "idx_priogub_periode_id"
    );
    await safeAddIndex("prioritas_kepala_daerah", "tahun", "idx_priogub_tahun");
    await safeAddIndex(
      "prioritas_kepala_daerah",
      "jenis_dokumen",
      "idx_priogub_jenis_dokumen"
    );
    await safeCreateUniqueIndex(
      "prioritas_kepala_daerah",
      "unique_priogub_combination",
      `kode_priogub, uraian_priogub(100), jenis_dokumen(100), tahun, periode_id`
    );

    // === prioritas_nasional ===
    await safeAddIndex(
      "prioritas_nasional",
      "periode_id",
      "idx_prionas_periode_id"
    );
    await safeAddIndex("prioritas_nasional", "tahun", "idx_prionas_tahun");
    await safeAddIndex(
      "prioritas_nasional",
      "jenis_dokumen",
      "idx_prionas_jenis_dokumen"
    );
    await safeCreateUniqueIndex(
      "prioritas_nasional",
      "unique_prionas_combination",
      `kode_prionas, uraian_prionas(100), jenis_dokumen(100), tahun, periode_id`
    );
  },

  async down(queryInterface) {
    const safeRemoveIndex = async (table, idxName) => {
      try {
        const [results] = await queryInterface.sequelize.query(`
          SHOW INDEX FROM \`${table}\` WHERE Key_name = '${idxName}';
        `);
        if (results.length > 0) {
          await queryInterface.removeIndex(table, idxName);
          console.log(`🧹 Index ${idxName} removed from ${table}`);
        } else {
          console.warn(`⚠️ Index ${idxName} not found on ${table}`);
        }
      } catch (e) {
        console.warn(
          `❌ Failed remove index ${idxName} from ${table}:`,
          e.message
        );
      }
    };

    const all = [
      // prioda
      { table: "prioritas_daerah", idx: "idx_prioda_periode_id" },
      { table: "prioritas_daerah", idx: "idx_prioda_tahun" },
      { table: "prioritas_daerah", idx: "idx_prioda_jenis_dokumen" },
      { table: "prioritas_daerah", idx: "unique_prioda_combination" },

      // priogub
      { table: "prioritas_kepala_daerah", idx: "idx_priogub_periode_id" },
      { table: "prioritas_kepala_daerah", idx: "idx_priogub_tahun" },
      { table: "prioritas_kepala_daerah", idx: "idx_priogub_jenis_dokumen" },
      { table: "prioritas_kepala_daerah", idx: "unique_priogub_combination" },

      // prionas
      { table: "prioritas_nasional", idx: "idx_prionas_periode_id" },
      { table: "prioritas_nasional", idx: "idx_prionas_tahun" },
      { table: "prioritas_nasional", idx: "idx_prionas_jenis_dokumen" },
      { table: "prioritas_nasional", idx: "unique_prionas_combination" },
    ];

    for (const { table, idx } of all) {
      await safeRemoveIndex(table, idx);
    }
  },
};
