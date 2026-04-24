"use strict";

/**
 * Migration: Buat tabel renstra (canonical/dokumen level)
 *
 * Error: "Table 'db_epelara.renstra' doesn't exist"
 * Model Renstra (renstraModel.js) mendefinisikan tabel ini tapi belum pernah dibuat.
 * Tabel ini berbeda dari renstra_opd (yang merupakan legacy struktur bertingkat).
 * Tabel renstra menyimpan dokumen Renstra level kanonikal dengan workflow approval.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("renstra")) {
      console.log("Tabel renstra sudah ada, skip create.");
      return;
    }

    await queryInterface.createTable("renstra", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      periode_awal: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      periode_akhir: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      judul: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "draft",
      },
      approval_status: {
        type: Sequelize.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      epelara_renstra_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      sinkronisasi_terakhir: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      sinkronisasi_status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "belum_sinkron",
      },
      dokumen_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      dibuat_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      disetujui_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      disetujui_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    // Index untuk performa query berdasarkan periode dan status
    await queryInterface.addIndex("renstra", ["periode_awal", "periode_akhir"], {
      name: "idx_renstra_periode",
    });
    await queryInterface.addIndex("renstra", ["status"], {
      name: "idx_renstra_status",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("renstra");
  },
};
