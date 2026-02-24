"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("program", {
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
      nama_program: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      kode_program: {
        type: Sequelize.STRING(50),
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
  async down(queryInterface) {
    await queryInterface.dropTable("program");
  },
};
