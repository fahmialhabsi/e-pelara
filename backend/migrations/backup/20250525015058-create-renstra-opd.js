"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("renstra_opd", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      opd_id: { type: Sequelize.INTEGER, allowNull: false },
      rpjmd_id: { type: Sequelize.INTEGER, allowNull: false },
      bidang_opd: { type: Sequelize.STRING, allowNull: false },
      sub_bidang_opd: { type: Sequelize.STRING, allowNull: false },
      tahun_mulai: { type: Sequelize.INTEGER, allowNull: false },
      tahun_akhir: { type: Sequelize.INTEGER, allowNull: false },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("renstra_opd");
  },
};
