"use strict";

/**
 * Migration: Tambah kolom nama_opd dan is_aktif ke tabel renstra_opd
 *
 * Latar belakang: Model RenstraOPD mendefinisikan kolom nama_opd dan is_aktif
 * tetapi kolom-kolom ini tidak ada di skema database awal.
 * Beberapa endpoint gagal karena mencoba query kolom yang belum ada.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable("renstra_opd");

    if (!tableDesc.nama_opd) {
      await queryInterface.addColumn("renstra_opd", "nama_opd", {
        type: Sequelize.STRING(255),
        allowNull: true,
        after: "sub_bidang_opd",
      });
    }

    if (!tableDesc.is_aktif) {
      await queryInterface.addColumn("renstra_opd", "is_aktif", {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        after: "nama_opd",
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable("renstra_opd");

    if (tableDesc.nama_opd) {
      await queryInterface.removeColumn("renstra_opd", "nama_opd");
    }
    if (tableDesc.is_aktif) {
      await queryInterface.removeColumn("renstra_opd", "is_aktif");
    }
  },
};
