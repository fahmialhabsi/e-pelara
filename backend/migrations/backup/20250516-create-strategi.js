// migrations/20250516-create-strategi.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("strategi", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      sasaran_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "sasaran",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      kode_strategi: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("strategi");
  },
};
