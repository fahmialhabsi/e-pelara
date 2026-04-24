"use strict";

/**
 * Master kegiatan — anak dari master_program.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("master_kegiatan")) {
      console.log("[migration] ⏭️  master_kegiatan sudah ada");
      return;
    }

    await queryInterface.createTable("master_kegiatan", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      master_program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "master_program",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      dataset_key: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "sekretariat_bidang_sheet2",
      },
      kode_kegiatan: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      kode_kegiatan_full: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      nama_kegiatan: {
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

    await queryInterface.addIndex("master_kegiatan", ["master_program_id"], {
      name: "idx_master_kegiatan_master_program_id",
    });
    await queryInterface.addIndex("master_kegiatan", ["dataset_key"], {
      name: "idx_master_kegiatan_dataset_key",
    });
    await queryInterface.addIndex(
      "master_kegiatan",
      ["dataset_key", "kode_kegiatan_full"],
      {
        unique: true,
        name: "uq_master_kegiatan_dataset_kode_kegiatan_full",
      },
    );

    console.log("[migration] ✅ master_kegiatan dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("master_kegiatan").catch(() => {});
  },
};
