"use strict";

module.exports = {
  async up(queryInterface) {
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

    await safeCreateUniqueIndex(
      "indikatorprograms",
      "unique_indikatorprograms_combination",
      `
        program_id,
        kode_indikator(100),
        jenis_dokumen(100),
        tahun
      `
    );
  },

  async down(queryInterface) {
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

    await safeRemoveIndex(
      "indikatorprograms",
      "unique_indikatorprograms_combination"
    );
  },
};
