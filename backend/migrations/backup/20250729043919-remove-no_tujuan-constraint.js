"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface
      .removeConstraint("tujuan", "no_tujuan")
      .then(() => {
        console.log("✅ Constraint no_tujuan berhasil dihapus.");
      })
      .catch(() => {
        console.log(
          "⚠️ Constraint no_tujuan tidak ditemukan atau sudah dihapus."
        );
      });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface
      .addConstraint("tujuan", {
        fields: ["no_tujuan"],
        type: "unique",
        name: "no_tujuan",
      })
      .then(() => {
        console.log("✅ Constraint no_tujuan dikembalikan.");
      })
      .catch(() => {
        console.log("⚠️ Gagal mengembalikan constraint no_tujuan.");
      });
  },
};
