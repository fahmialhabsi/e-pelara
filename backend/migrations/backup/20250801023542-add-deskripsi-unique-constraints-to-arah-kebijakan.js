"use strict";

module.exports = {
  async up(queryInterface) {
    const table = "arah_kebijakan";
    const oldIndex = "unique_arah_kebijakan_combination";
    const newIndex = "unique_arah_kebijakan_combination_v2";

    // Drop index lama
    try {
      await queryInterface.removeIndex(table, oldIndex);
      console.log(`🧹 Index ${oldIndex} dihapus`);
    } catch (e) {
      console.warn(
        `⚠️ Gagal hapus index ${oldIndex} (mungkin sudah dihapus):`,
        e.message
      );
    }

    // Buat index baru dengan tambahan deskripsi
    try {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX ${newIndex}
        ON \`${table}\` (
          \`kode_arah\`,
          \`strategi_id\`,
          \`deskripsi\`(100),
          \`jenis_dokumen\`(100),
          \`tahun\`,
          \`periode_id\`
        );
      `);
      console.log(`✅ Unique index ${newIndex} berhasil dibuat`);
    } catch (e) {
      console.error(`❌ Gagal membuat unique index ${newIndex}:`, e.message);
    }
  },

  async down(queryInterface) {
    const table = "arah_kebijakan";
    const newIndex = "unique_arah_kebijakan_combination_v2";
    const oldIndex = "unique_arah_kebijakan_combination";

    // Hapus index baru
    try {
      await queryInterface.removeIndex(table, newIndex);
      console.log(`🧹 Index ${newIndex} dihapus`);
    } catch (e) {
      console.warn(`⚠️ Gagal hapus index ${newIndex}:`, e.message);
    }

    // Kembalikan index lama (tanpa deskripsi)
    try {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX ${oldIndex}
        ON \`${table}\` (
          \`kode_arah\`,
          \`strategi_id\`,
          \`jenis_dokumen\`(100),
          \`tahun\`,
          \`periode_id\`
        );
      `);
      console.log(`🔁 Index ${oldIndex} dikembalikan`);
    } catch (e) {
      console.error(`❌ Gagal mengembalikan index ${oldIndex}:`, e.message);
    }
  },
};
