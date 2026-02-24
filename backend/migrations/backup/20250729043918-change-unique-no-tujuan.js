"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Hapus constraint unik lama (pastikan nama constraint sesuai atau diganti dengan queryInterface.showConstraint jika tidak tahu pasti)
    await queryInterface
      .removeConstraint("tujuan", "tujuan_no_tujuan_key")
      .catch(() => {
        console.log(
          "⚠️ Constraint tujuan_no_tujuan_key tidak ditemukan. Lewat."
        );
      });

    // 2. Tambahkan constraint unik baru
    await queryInterface.addConstraint("tujuan", {
      fields: ["no_tujuan", "jenis_dokumen", "tahun", "periode_id"],
      type: "unique",
      name: "unique_no_tujuan_dokumen_tahun_periode",
    });

    console.log("✅ Constraint unik baru ditambahkan.");
  },

  async down(queryInterface, Sequelize) {
    // Rollback ke constraint sebelumnya (UNIQUE(no_tujuan))
    await queryInterface
      .removeConstraint("tujuan", "unique_no_tujuan_dokumen_tahun_periode")
      .catch(() => {
        console.log("⚠️ Constraint rollback tidak ditemukan. Lewat.");
      });

    await queryInterface.addConstraint("tujuan", {
      fields: ["no_tujuan"],
      type: "unique",
      name: "tujuan_no_tujuan_key",
    });

    console.log("✅ Constraint rollback ke hanya no_tujuan.");
  },
};
