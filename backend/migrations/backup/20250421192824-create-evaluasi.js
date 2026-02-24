"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("evaluasi", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tahun: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sub_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "sub_kegiatan",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status_kinerja: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      evaluasi_fisik: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      evaluasi_anggaran: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rekomendasi: {
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
    await queryInterface.dropTable("evaluasi");
  },
};
