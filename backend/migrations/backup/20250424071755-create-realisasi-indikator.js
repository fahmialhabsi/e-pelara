"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("realisasi_indikator", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "indikator", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      periode: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nilai_realisasi: {
        type: Sequelize.DECIMAL,
        allowNull: false,
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
    await queryInterface.dropTable("realisasi_indikator");
  },
};
