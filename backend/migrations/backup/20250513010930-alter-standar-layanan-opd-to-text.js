"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // ubah standar_layanan_opd jadi TEXT (atau LONGTEXT jika sangat panjang)
    await queryInterface.changeColumn(
      "prioritas_kepala_daerah",
      "standar_layanan_opd",
      {
        type: Sequelize.TEXT,
        allowNull: true,
      }
    );
    // (opsional) juga ubah opd_tujuan jika perlu
    await queryInterface.changeColumn("prioritas_kepala_daerah", "opd_tujuan", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // rollback ke VARCHAR(255)
    await queryInterface.changeColumn(
      "prioritas_kepala_daerah",
      "standar_layanan_opd",
      {
        type: Sequelize.TEXT,
        allowNull: true,
      }
    );
    await queryInterface.changeColumn("prioritas_kepala_daerah", "opd_tujuan", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
};
