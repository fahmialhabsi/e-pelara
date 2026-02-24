"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("prioritas_daerah", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.addColumn("prioritas_nasional", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.addColumn("prioritas_kepala_daerah", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    console.log("✅ Kolom periode_id berhasil ditambahkan ke ketiga tabel.");
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("prioritas_daerah", "periode_id");
    await queryInterface.removeColumn("prioritas_nasional", "periode_id");
    await queryInterface.removeColumn("prioritas_kepala_daerah", "periode_id");
    console.log("🧹 Kolom periode_id dihapus dari ketiga tabel.");
  },
};
