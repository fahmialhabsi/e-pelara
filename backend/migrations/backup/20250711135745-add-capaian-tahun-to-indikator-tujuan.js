"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("indikatortujuans", "capaian_tahun_1", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "capaian_tahun_2", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "capaian_tahun_3", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "capaian_tahun_4", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "capaian_tahun_5", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("indikatortujuans", "capaian_tahun_1");
    await queryInterface.removeColumn("indikatortujuans", "capaian_tahun_2");
    await queryInterface.removeColumn("indikatortujuans", "capaian_tahun_3");
    await queryInterface.removeColumn("indikatortujuans", "capaian_tahun_4");
    await queryInterface.removeColumn("indikatortujuans", "capaian_tahun_5");
  },
};
