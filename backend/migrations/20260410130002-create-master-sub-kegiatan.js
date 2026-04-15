"use strict";

/**
 * Master sub kegiatan — anak dari master_kegiatan.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("master_sub_kegiatan")) {
      console.log("[migration] ⏭️  master_sub_kegiatan sudah ada");
      return;
    }

    await queryInterface.createTable("master_sub_kegiatan", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      master_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "master_kegiatan",
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
      kode_sub_kegiatan: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      kode_sub_kegiatan_full: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      nama_sub_kegiatan: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      kinerja: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Kolom kinerja dari sumber normalisasi",
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

    await queryInterface.addIndex(
      "master_sub_kegiatan",
      ["master_kegiatan_id"],
      {
        name: "idx_master_sub_kegiatan_master_kegiatan_id",
      },
    );
    await queryInterface.addIndex("master_sub_kegiatan", ["dataset_key"], {
      name: "idx_master_sub_kegiatan_dataset_key",
    });
    await queryInterface.addIndex(
      "master_sub_kegiatan",
      ["dataset_key", "kode_sub_kegiatan_full"],
      {
        unique: true,
        name: "uq_master_sub_kegiatan_dataset_kode_sub_full",
      },
    );

    console.log("[migration] ✅ master_sub_kegiatan dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("master_sub_kegiatan").catch(() => {});
  },
};
