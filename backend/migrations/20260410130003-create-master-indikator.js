"use strict";

/**
 * Master indikator — anak dari master_sub_kegiatan (1 baris sumber ≈ 1 indikator per sub).
 * Mendukung banyak indikator per sub lewat kolom urutan.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("master_indikator")) {
      console.log("[migration] ⏭️  master_indikator sudah ada");
      return;
    }

    await queryInterface.createTable("master_indikator", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      master_sub_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "master_sub_kegiatan",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      urutan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Urutan indikator dalam satu sub kegiatan",
      },
      indikator: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "Teks indikator dari sumber",
      },
      satuan: {
        type: Sequelize.STRING(128),
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

    await queryInterface.addIndex(
      "master_indikator",
      ["master_sub_kegiatan_id"],
      {
        name: "idx_master_indikator_master_sub_kegiatan_id",
      },
    );
    await queryInterface.addIndex(
      "master_indikator",
      ["master_sub_kegiatan_id", "urutan"],
      {
        unique: true,
        name: "uq_master_indikator_sub_urutan",
      },
    );

    console.log("[migration] ✅ master_indikator dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("master_indikator").catch(() => {});
  },
};
