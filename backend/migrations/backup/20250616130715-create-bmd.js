"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("bmd", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      nama_barang: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      kode_barang: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tahun_perolehan: {
        type: Sequelize.STRING,
      },
      kondisi: {
        type: Sequelize.STRING,
      },
      nilai_perolehan: {
        type: Sequelize.DOUBLE,
      },
      sumber_dana: {
        type: Sequelize.STRING,
      },
      keterangan: {
        type: Sequelize.TEXT,
      },
      jenis_dokumen: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("bmd");
  },
};
