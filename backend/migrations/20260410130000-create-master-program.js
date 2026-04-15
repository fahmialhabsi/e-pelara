"use strict";

/**
 * Master program (referensi Sheet2_Normalized).
 * Kunci bisnis: (dataset_key, kode_program_full).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("master_program")) {
      console.log("[migration] ⏭️  master_program sudah ada");
      return;
    }

    await queryInterface.createTable("master_program", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      dataset_key: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "sekretariat_bidang_sheet2",
        comment:
          "Pembeda sumber/OPD/sheet; perluas dengan nilai baru saat impor sheet lain",
      },
      kode_urusan: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      kode_bidang_urusan: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      kode_program: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: "Segmen kode program (bukan kunci unik global)",
      },
      kode_program_full: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: "Kode unik program pada dataset_key ini",
      },
      nama_urusan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      nama_program: {
        type: Sequelize.TEXT,
        allowNull: false,
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

    await queryInterface.addIndex("master_program", ["dataset_key"], {
      name: "idx_master_program_dataset_key",
    });
    await queryInterface.addIndex(
      "master_program",
      ["dataset_key", "kode_program_full"],
      {
        unique: true,
        name: "uq_master_program_dataset_kode_program_full",
      },
    );

    console.log("[migration] ✅ master_program dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("master_program").catch(() => {});
  },
};
