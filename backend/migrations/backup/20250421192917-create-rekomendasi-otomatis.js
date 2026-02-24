"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("rekomendasi_otomatis", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      evaluasi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "evaluasi",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      hasil_analisis: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      rekomendasi: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      dibuat_oleh: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      dibuat_tanggal: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
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
    await queryInterface.dropTable("rekomendasi_otomatis");
  },
};
