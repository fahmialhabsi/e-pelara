/**
 * Migration: tabel Mini SIPD Internal — sipd_ref_program, kegiatan, subkegiatan, realisasi.
 * Idempotent — skip jika sudah ada.
 */
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));

    // ── 1. sipd_ref_program ──────────────────────────────────────────
    if (!existing.has("sipd_ref_program")) {
      await queryInterface.createTable("sipd_ref_program", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        kode: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        nama: { type: Sequelize.STRING(255), allowNull: false },
        urusan: { type: Sequelize.STRING(100), allowNull: true },
        bidang_urusan: { type: Sequelize.STRING(100), allowNull: true },
        level: { type: Sequelize.TINYINT, defaultValue: 1 },
        aktif: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
      });
      console.log("[migration] ✅ sipd_ref_program dibuat");
    } else { console.log("[migration] ⏭️  sipd_ref_program sudah ada"); }

    // ── 2. sipd_ref_kegiatan ─────────────────────────────────────────
    if (!existing.has("sipd_ref_kegiatan")) {
      await queryInterface.createTable("sipd_ref_kegiatan", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        program_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "sipd_ref_program", key: "id" },
          onDelete: "CASCADE",
        },
        kode: { type: Sequelize.STRING(50), allowNull: false },
        nama: { type: Sequelize.STRING(255), allowNull: false },
        aktif: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
      });
      console.log("[migration] ✅ sipd_ref_kegiatan dibuat");
    } else { console.log("[migration] ⏭️  sipd_ref_kegiatan sudah ada"); }

    // ── 3. sipd_ref_subkegiatan ──────────────────────────────────────
    if (!existing.has("sipd_ref_subkegiatan")) {
      await queryInterface.createTable("sipd_ref_subkegiatan", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        kegiatan_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "sipd_ref_kegiatan", key: "id" },
          onDelete: "CASCADE",
        },
        kode: { type: Sequelize.STRING(50), allowNull: false },
        nama: { type: Sequelize.STRING(255), allowNull: false },
        indikator_kinerja: { type: Sequelize.TEXT, allowNull: true },
        satuan: { type: Sequelize.STRING(50), allowNull: true },
        aktif: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
      });
      console.log("[migration] ✅ sipd_ref_subkegiatan dibuat");
    } else { console.log("[migration] ⏭️  sipd_ref_subkegiatan sudah ada"); }

    // ── 4. sipd_realisasi ────────────────────────────────────────────
    if (!existing.has("sipd_realisasi")) {
      await queryInterface.createTable("sipd_realisasi", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        program_id: { type: Sequelize.INTEGER, allowNull: true },
        kegiatan_id: { type: Sequelize.INTEGER, allowNull: true },
        subkegiatan_id: { type: Sequelize.INTEGER, allowNull: true },
        tahun: { type: Sequelize.STRING(4), allowNull: false },
        bulan: { type: Sequelize.TINYINT, allowNull: false },
        anggaran: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
        realisasi: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
        persen: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
        keterangan: { type: Sequelize.TEXT, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
      });
      console.log("[migration] ✅ sipd_realisasi dibuat");
    } else { console.log("[migration] ⏭️  sipd_realisasi sudah ada"); }

    // ── 5. sipd_anggaran_kas ─────────────────────────────────────────
    if (!existing.has("sipd_anggaran_kas")) {
      await queryInterface.createTable("sipd_anggaran_kas", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        dpa_id: { type: Sequelize.INTEGER, allowNull: true },
        program_id: { type: Sequelize.INTEGER, allowNull: true },
        kegiatan_id: { type: Sequelize.INTEGER, allowNull: true },
        tahun: { type: Sequelize.STRING(4), allowNull: false },
        bulan: { type: Sequelize.TINYINT, allowNull: false },
        pagu: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
      });
      console.log("[migration] ✅ sipd_anggaran_kas dibuat");
    } else { console.log("[migration] ⏭️  sipd_anggaran_kas sudah ada"); }
  },

  async down(queryInterface) {
    for (const t of [
      "sipd_anggaran_kas",
      "sipd_realisasi",
      "sipd_ref_subkegiatan",
      "sipd_ref_kegiatan",
      "sipd_ref_program",
    ]) {
      await queryInterface.dropTable(t).catch(() => {});
    }
  },
};
