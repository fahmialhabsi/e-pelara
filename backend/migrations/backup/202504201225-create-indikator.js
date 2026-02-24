"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("indikator", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      sasaran_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "sasaran",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      nama_indikator: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      satuan: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      target: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("indikator");
  },
};
