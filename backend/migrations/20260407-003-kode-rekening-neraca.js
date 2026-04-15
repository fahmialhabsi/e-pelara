/**
 * Migration: tabel kode_rekening dan kode_neraca (referensi Permendagri 90).
 * Idempotent.
 */
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));

    // ── kode_neraca ──────────────────────────────────────────────────
    if (!existing.has("kode_neraca")) {
      await queryInterface.createTable("kode_neraca", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        kode_neraca: { type: Sequelize.STRING(50), allowNull: false },
        nama: { type: Sequelize.STRING(255), allowNull: false },
        parent_kode: { type: Sequelize.STRING(50), allowNull: true },
        level: { type: Sequelize.TINYINT, defaultValue: 1 },
        jenis: { type: Sequelize.STRING(50), allowNull: true, comment: "ASET/KEWAJIBAN/EKUITAS" },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
      });
      console.log("[migration] ✅ kode_neraca dibuat");
    } else { console.log("[migration] ⏭️  kode_neraca sudah ada"); }

    // ── kode_rekening ────────────────────────────────────────────────
    if (!existing.has("kode_rekening")) {
      await queryInterface.createTable("kode_rekening", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        kode_rekening: { type: Sequelize.STRING(30), allowNull: false },
        nama: { type: Sequelize.STRING(255), allowNull: false },
        parent_kode: { type: Sequelize.STRING(30), allowNull: true },
        level: { type: Sequelize.TINYINT, defaultValue: 1 },
        kelompok: { type: Sequelize.STRING(100), allowNull: true },
        jenis: { type: Sequelize.STRING(100), allowNull: true },
        objek: { type: Sequelize.STRING(100), allowNull: true },
        rincian: { type: Sequelize.STRING(255), allowNull: true },
        kode_permendagri: { type: Sequelize.STRING(30), allowNull: true, comment: "Kode asli Permendagri 90" },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
      });
      console.log("[migration] ✅ kode_rekening dibuat");
    } else { console.log("[migration] ⏭️  kode_rekening sudah ada"); }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("kode_rekening").catch(() => {});
    await queryInterface.dropTable("kode_neraca").catch(() => {});
  },
};
