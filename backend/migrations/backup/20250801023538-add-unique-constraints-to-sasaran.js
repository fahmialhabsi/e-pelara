"use strict";

module.exports = {
  async up(queryInterface) {
    // ========== FUNGSI BANTU ==========

    const safeAddIndex = async (table, column, indexName) => {
      try {
        await queryInterface.addIndex(table, [column], { name: indexName });
        console.log(
          `Index ${indexName} berhasil ditambahkan ke tabel ${table}.`
        );
      } catch (e) {
        if (e.message.includes("Duplicate key name")) {
          console.warn(`Index ${indexName} sudah ada. Melewati.`);
        } else {
          console.error(`Gagal menambahkan index ${indexName}:`, e.message);
        }
      }
    };

    const safeCreateUniqueIndex = async (table, indexName, columnsRaw) => {
      try {
        await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX ${indexName}
          ON \`${table}\` (${columnsRaw});
        `);
        console.log(`Unique index ${indexName} berhasil dibuat.`);
      } catch (e) {
        if (e.message.includes("Duplicate key name")) {
          console.warn(`Unique index ${indexName} sudah ada. Melewati.`);
        } else {
          console.error(`Gagal membuat unique index ${indexName}:`, e.message);
        }
      }
    };

    // ========== DEFINISI INDEX ==========

    const simpleIndexes = [
      {
        table: "sasaran",
        column: "jenis_dokumen",
        name: "idx_sasaran_jenis_dokumen",
      },
      { table: "sasaran", column: "tahun", name: "idx_sasaran_tahun" },
      {
        table: "sasaran",
        column: "periode_id",
        name: "idx_sasaran_periode_id",
      },
      {
        table: "strategi",
        column: "sasaran_id",
        name: "idx_strategi_sasaran_id",
      },
    ];

    const uniqueIndexes = [
      {
        table: "sasaran",
        name: "unique_sasaran_combination",
        columnsRaw: `
      nomor,
      tujuan_id,
      jenis_dokumen(100),
      tahun,
      periode_id
    `,
      },
      {
        table: "strategi",
        name: "unique_strategi_per_sasaran",
        columnsRaw: `
      sasaran_id,
      deskripsi(100),
      jenis_dokumen(100),
      tahun,
      periode_id
    `,
      },
    ];

    // ========== EKSEKUSI ==========

    for (const { table, column, name } of simpleIndexes) {
      await safeAddIndex(table, column, name);
    }

    for (const { table, name, columnsRaw } of uniqueIndexes) {
      await safeCreateUniqueIndex(table, name, columnsRaw);
    }
  },

  async down(queryInterface) {
    // ========== FUNGSI BANTU ==========

    const safeRemoveIndex = async (table, indexName) => {
      try {
        const [results] = await queryInterface.sequelize.query(`
          SHOW INDEX FROM \`${table}\` WHERE Key_name = '${indexName}';
        `);

        if (results.length > 0) {
          await queryInterface.removeIndex(table, indexName);
          console.log(
            `Index ${indexName} berhasil dihapus dari tabel ${table}.`
          );
        } else {
          console.warn(
            `Index ${indexName} tidak ditemukan di tabel ${table}. Melewati.`
          );
        }
      } catch (e) {
        console.warn(
          `Gagal menghapus index ${indexName} dari tabel ${table}:`,
          e.message
        );
      }
    };

    // ========== GABUNGKAN SEMUA INDEX YANG INGIN DIHAPUS ==========

    const allIndexes = [
      // Simple
      { table: "sasaran", index: "idx_sasaran_jenis_dokumen" },
      { table: "sasaran", index: "idx_sasaran_tahun" },
      { table: "sasaran", index: "idx_sasaran_periode_id" },
      { table: "strategi", index: "idx_strategi_sasaran_id" },
      // Unique
      { table: "sasaran", index: "unique_sasaran_combination" },
      { table: "strategi", index: "unique_strategi_per_sasaran" },
    ];

    for (const { table, index } of allIndexes) {
      await safeRemoveIndex(table, index);
    }
  },
};
