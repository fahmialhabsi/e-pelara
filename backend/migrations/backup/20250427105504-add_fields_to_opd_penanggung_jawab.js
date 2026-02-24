"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("opd_penanggung_jawab", "misi_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // atau false tergantung kebutuhan
    });

    await queryInterface.addColumn("opd_penanggung_jawab", "nama_opd", {
      type: Sequelize.STRING,
      allowNull: true, // atau false tergantung kebutuhan
    });

    await queryInterface.addColumn("opd_penanggung_jawab", "nama_bidang_opd", {
      type: Sequelize.STRING,
      allowNull: true, // atau false tergantung kebutuhan
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("opd_penanggung_jawab", "misi_id");
    await queryInterface.removeColumn("opd_penanggung_jawab", "nama_opd");
    await queryInterface.removeColumn(
      "opd_penanggung_jawab",
      "nama_bidang_opd"
    );
  },
};
