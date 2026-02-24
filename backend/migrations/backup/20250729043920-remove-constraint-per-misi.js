"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface
      .removeConstraint("tujuan", "unique_no_tujuan_per_misi_periode")
      .then(() =>
        console.log(
          "✅ Constraint unique_no_tujuan_per_misi_periode berhasil dihapus."
        )
      )
      .catch(() =>
        console.log("⚠️ Constraint tidak ditemukan atau sudah dihapus.")
      );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addConstraint("tujuan", {
      fields: ["misi_id", "periode_id", "no_tujuan"],
      type: "unique",
      name: "unique_no_tujuan_per_misi_periode",
    });
    console.log("🔁 Constraint dikembalikan.");
  },
};
