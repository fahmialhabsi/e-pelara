"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = [
      "divisions",
      "indikator",
      "kegiatan",
      "misi",
      "opd_penanggung_jawab",
      "program",
      "sasaran",
      "sub_kegiatan",
      "tujuan",
      "visi",
    ];

    for (const table of tables) {
      // Ambil struktur tabel
      const tableDescription = await queryInterface.describeTable(table);

      // Hanya tambah kolom kalau belum ada
      if (!tableDescription.rpjmd_id) {
        await queryInterface.addColumn(table, "rpjmd_id", {
          type: Sequelize.INTEGER,
          allowNull: true, // bisa diubah jadi false setelah data siap
          references: { model: "rpjmd", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        });
        console.log(`✅ Kolom rpjmd_id ditambahkan di tabel ${table}`);
      } else {
        console.log(`ℹ️ Kolom rpjmd_id sudah ada di tabel ${table}, dilewati`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = [
      "divisions",
      "indikator",
      "kegiatan",
      "misi",
      "opd_penanggung_jawab",
      "program",
      "sasaran",
      "sub_kegiatan",
      "tujuan",
      "visi",
    ];

    for (const table of tables) {
      const tableDescription = await queryInterface.describeTable(table);

      // Hanya hapus kolom kalau memang ada
      if (tableDescription.rpjmd_id) {
        await queryInterface.removeColumn(table, "rpjmd_id");
        console.log(`❌ Kolom rpjmd_id dihapus dari tabel ${table}`);
      } else {
        console.log(
          `ℹ️ Kolom rpjmd_id tidak ditemukan di tabel ${table}, dilewati`
        );
      }
    }
  },
};
