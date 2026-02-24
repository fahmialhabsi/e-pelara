"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("realisasi_sub_kegiatan_rpjmd", {
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
      capaian_output: {
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("realisasi_sub_kegiatan_rpjmd");
  },
};
