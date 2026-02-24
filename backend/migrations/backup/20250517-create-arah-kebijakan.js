// migrations/20250517-create-arah-kebijakan.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("arah_kebijakan", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      strategi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "strategi",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      kode_arah: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      prioritas: {
        type: Sequelize.STRING,
        allowNull: true,
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
    await queryInterface.dropTable("arah_kebijakan");
  },
};
