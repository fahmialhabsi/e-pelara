"use strict";

module.exports = {
  async up(queryInterface) {
    // ========== FUNGSI BANTU ==========

    const safeAddIndex = async (table, column, indexName) => {
      try {
        await queryInterface.addIndex(table, [column], { name: indexName });
        console.log(`✅ Index ${indexName} ditambahkan ke tabel ${table}`);
      } catch (e) {
        if (e.message.includes("Duplicate key name")) {
          console.warn(`⚠️ Index ${indexName} sudah ada, dilewati`);
        } else {
          console.error(`❌ Gagal tambah index ${indexName}:`, e.message);
        }
      }
    };

    const safeCreateUniqueIndex = async (table, indexName, columnsRaw) => {
      try {
        await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX ${indexName}
          ON \`${table}\` (${columnsRaw});
        `);
        console.log(`✅ Unique index ${indexName} berhasil dibuat`);
      } catch (e) {
        if (e.message.includes("Duplicate key name")) {
          console.warn(`⚠️ Unique index ${indexName} sudah ada, dilewati`);
        } else {
          console.error(
            `❌ Gagal create unique index ${indexName}:`,
            e.message
          );
        }
      }
    };

    // ========== DEFINISI INDEX ==========

    const simpleIndexes = [
      {
        table: "arah_kebijakan",
        column: "jenis_dokumen",
        name: "idx_arah_jenis_dokumen",
      },
      {
        table: "arah_kebijakan",
        column: "tahun",
        name: "idx_arah_tahun",
      },
      {
        table: "arah_kebijakan",
        column: "periode_id",
        name: "idx_arah_periode_id",
      },
      {
        table: "arah_kebijakan",
        column: "strategi_id",
        name: "idx_arah_strategi_id",
      },
    ];

    const uniqueIndexes = [
      {
        table: "arah_kebijakan",
        name: "unique_arah_kebijakan_combination",
        columnsRaw: `
          kode_arah,
          strategi_id,
          jenis_dokumen(100),
          tahun,
          periode_id
        `,
      },
    ];

    for (const { table, column, name } of simpleIndexes) {
      await safeAddIndex(table, column, name);
    }

    for (const { table, name, columnsRaw } of uniqueIndexes) {
      await safeCreateUniqueIndex(table, name, columnsRaw);
    }
  },

  async down(queryInterface) {
    const safeRemoveIndex = async (table, indexName) => {
      try {
        const [results] = await queryInterface.sequelize.query(`
          SHOW INDEX FROM \`${table}\` WHERE Key_name = '${indexName}';
        `);
        if (results.length > 0) {
          await queryInterface.removeIndex(table, indexName);
          console.log(`🧹 Index ${indexName} dihapus dari ${table}`);
        } else {
          console.warn(`⚠️ Index ${indexName} tidak ditemukan, dilewati`);
        }
      } catch (e) {
        console.warn(`❌ Gagal hapus index ${indexName}:`, e.message);
      }
    };

    const allIndexes = [
      { table: "arah_kebijakan", index: "idx_arah_jenis_dokumen" },
      { table: "arah_kebijakan", index: "idx_arah_tahun" },
      { table: "arah_kebijakan", index: "idx_arah_periode_id" },
      { table: "arah_kebijakan", index: "idx_arah_strategi_id" },
      { table: "arah_kebijakan", index: "unique_arah_kebijakan_combination" },
    ];

    for (const { table, index } of allIndexes) {
      await safeRemoveIndex(table, index);
    }
  },
};
