"use strict";

/**
 * Migration: Tambah kolom capaian_program, capaian_kegiatan, capaian_subkegiatan
 * dan kolom satuan/pagu ke tabel renstra_target.
 *
 * Error: "Unknown column 'RenstraTarget.capaian_program' in 'field list'"
 * Model mendefinisikan kolom ini tapi belum ada di database.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable("renstra_target");

    const columnsToAdd = [
      {
        name: "capaian_program",
        definition: {
          type: Sequelize.DECIMAL(18, 2),
          allowNull: true,
        },
      },
      {
        name: "capaian_kegiatan",
        definition: {
          type: Sequelize.DECIMAL(18, 2),
          allowNull: true,
        },
      },
      {
        name: "capaian_subkegiatan",
        definition: {
          type: Sequelize.DECIMAL(18, 2),
          allowNull: true,
        },
      },
      {
        name: "satuan_program",
        definition: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
      },
      {
        name: "pagu_program",
        definition: {
          type: Sequelize.BIGINT,
          allowNull: true,
        },
      },
      {
        name: "satuan_kegiatan",
        definition: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
      },
      {
        name: "pagu_kegiatan",
        definition: {
          type: Sequelize.BIGINT,
          allowNull: true,
        },
      },
      {
        name: "satuan_subkegiatan",
        definition: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
      },
      {
        name: "pagu_subkegiatan",
        definition: {
          type: Sequelize.BIGINT,
          allowNull: true,
        },
      },
    ];

    for (const col of columnsToAdd) {
      if (!tableDesc[col.name]) {
        await queryInterface.addColumn("renstra_target", col.name, col.definition);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable("renstra_target");
    const cols = [
      "capaian_program",
      "capaian_kegiatan",
      "capaian_subkegiatan",
      "satuan_program",
      "pagu_program",
      "satuan_kegiatan",
      "pagu_kegiatan",
      "satuan_subkegiatan",
      "pagu_subkegiatan",
    ];
    for (const col of cols) {
      if (tableDesc[col]) {
        await queryInterface.removeColumn("renstra_target", col);
      }
    }
  },
};
