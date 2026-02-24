"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("realisasi_sub_kegiatan", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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
      tahun: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      triwulan: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      target_fisik: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      realisasi_fisik: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      target_anggaran: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      realisasi_anggaran: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      kendala: {
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
    await queryInterface.dropTable("realisasi_sub_kegiatan");
  },
};
