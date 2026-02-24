"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("pengkeg", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tahun: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      periode_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      nama_kegiatan: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      realisasi_fisik: {
        type: Sequelize.DOUBLE,
      },
      realisasi_keuangan: {
        type: Sequelize.DOUBLE,
      },
      keterangan: {
        type: Sequelize.TEXT,
      },
      jenis_dokumen: {
        type: Sequelize.STRING,
      },
      dpa_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "dpa",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("pengkeg");
  },
};
