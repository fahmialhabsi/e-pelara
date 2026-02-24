"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("penatausahaan", {
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
      tanggal_transaksi: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      uraian: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      jumlah: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      jenis_transaksi: {
        type: Sequelize.STRING, // contoh: 'Belanja', 'Pendapatan', dll.
      },
      bukti: {
        type: Sequelize.STRING, // bisa jadi path file atau nomor bukti
      },
      sumber_dana: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("penatausahaan");
  },
};
