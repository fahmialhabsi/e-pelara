"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("monitoring_indikator", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "indikator",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      tahun: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      capaian: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      keterangan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("monitoring_indikator");
  },
};
