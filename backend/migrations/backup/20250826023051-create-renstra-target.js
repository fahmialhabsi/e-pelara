"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("renstra_target", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "indikator_renstra", // tabel induk
          key: "id",
        },
        onDelete: "CASCADE",
      },
      tahun: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      target_value: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },
      satuan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pagu_anggaran: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      lokasi: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("renstra_target");
  },
};
