"use strict";

module.exports = {
  async up(queryInterface) {
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


    // Simple indexes
    const simpleIndexes = [
      {
        table: "sub_kegiatan",
        column: "periode_id",
        name: "idx_sub_kegiatan_periode_id",
      },
      {
        table: "sub_kegiatan",
        column: "tahun",
        name: "idx_sub_kegiatan_tahun",
      },
      {
        table: "sub_kegiatan",
        column: "jenis_dokumen",
        name: "idx_sub_kegiatan_jenis_dokumen",
      },
      {
        table: "sub_kegiatan",
        column: "kegiatan_id",
        name: "idx_sub_kegiatan_kegiatan_id",
      },
    ];

    // Unique constraint
    const uniqueIndexes = [
      {
        table: "sub_kegiatan",
        name: "unique_sub_kegiatan_per_periode",
        columnsRaw: `
          kode_sub_kegiatan,
          periode_id,
          tahun,
          jenis_dokumen(100)
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
          console.log(`🧹 Index ${indexName} berhasil dihapus dari ${table}`);
        } else {
          console.warn(`⚠️ Index ${indexName} tidak ditemukan, dilewati`);
        }
      } catch (e) {
        console.warn(`❌ Gagal hapus index ${indexName}:`, e.message);
      }
    };

    const allIndexes = [
      // Simple
      { table: "sub_kegiatan", index: "idx_sub_kegiatan_periode_id" },
      { table: "sub_kegiatan", index: "idx_sub_kegiatan_tahun" },
      { table: "sub_kegiatan", index: "idx_sub_kegiatan_jenis_dokumen" },
      { table: "sub_kegiatan", index: "idx_sub_kegiatan_kegiatan_id" },
      // Unique
      { table: "sub_kegiatan", index: "unique_sub_kegiatan_per_periode" },
    ];

    for (const { table, index } of allIndexes) {
      await safeRemoveIndex(table, index);
    }
  },
};
