/**
 * Migration: tambah kolom status approval ke dokumen utama + buat tabel approval_logs.
 * Idempotent — skip jika kolom/tabel sudah ada.
 */
"use strict";

const APPROVAL_STATUS_ENUM = "ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT'";

const DOCS_WITH_STATUS = ["dpa", "rka", "lakip", "renja", "rkpd"];

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Pastikan tabel approval_logs ada
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));

    if (!existing.has("approval_logs")) {
      await queryInterface.createTable("approval_logs", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        entity_type: { type: Sequelize.STRING(100), allowNull: false },
        entity_id: { type: Sequelize.INTEGER, allowNull: false },
        action: {
          type: Sequelize.ENUM("SUBMIT", "APPROVE", "REJECT", "REVISE"),
          allowNull: false,
        },
        from_status: {
          type: Sequelize.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
          allowNull: true,
        },
        to_status: {
          type: Sequelize.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
          allowNull: false,
        },
        user_id: { type: Sequelize.INTEGER, allowNull: true },
        username: { type: Sequelize.STRING(150), allowNull: true },
        catatan: { type: Sequelize.TEXT, allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
      console.log("[migration] ✅ Tabel approval_logs dibuat");
    } else {
      console.log("[migration] ⏭️  approval_logs sudah ada, skip");
    }

    // 2. Tambah kolom status ke setiap tabel dokumen
    for (const table of DOCS_WITH_STATUS) {
      if (!existing.has(table)) {
        console.log(`[migration] ⚠️  Tabel ${table} tidak ada, skip`);
        continue;
      }
      const desc = await queryInterface.describeTable(table).catch(() => null);
      if (desc && !desc.approval_status) {
        await queryInterface.addColumn(table, "approval_status", {
          type: Sequelize.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
          allowNull: false,
          defaultValue: "DRAFT",
        });
        console.log(`[migration] ✅ Kolom approval_status ditambah ke ${table}`);
      } else {
        console.log(`[migration] ⏭️  approval_status sudah ada di ${table}`);
      }
    }

    // 3. approval_config — konfigurasi level per jenis dokumen
    if (!existing.has("approval_config")) {
      await queryInterface.createTable("approval_config", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        entity_type: { type: Sequelize.STRING(100), allowNull: false },
        level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        role_required: { type: Sequelize.STRING(50), allowNull: false },
        label: { type: Sequelize.STRING(100), allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
      // Seed config
      await queryInterface.bulkInsert("approval_config", [
        { entity_type: "dpa",   level: 1, role_required: "ADMINISTRATOR", label: "Sekretaris/Kabid" },
        { entity_type: "dpa",   level: 2, role_required: "SUPER_ADMIN",   label: "Kepala Dinas" },
        { entity_type: "rka",   level: 1, role_required: "ADMINISTRATOR", label: "Sekretaris/Kabid" },
        { entity_type: "lakip", level: 1, role_required: "ADMINISTRATOR", label: "Kepala Bidang" },
        { entity_type: "renja", level: 1, role_required: "ADMINISTRATOR", label: "Kepala Bidang" },
        { entity_type: "rkpd",  level: 1, role_required: "ADMINISTRATOR", label: "Kepala Bidang" },
        { entity_type: "rpjmd", level: 1, role_required: "ADMINISTRATOR", label: "Kepala Bidang" },
        { entity_type: "rpjmd", level: 2, role_required: "SUPER_ADMIN",   label: "Kepala Dinas" },
      ]);
      console.log("[migration] ✅ Tabel approval_config dibuat + di-seed");
    }
  },

  async down(queryInterface) {
    for (const table of DOCS_WITH_STATUS) {
      await queryInterface.removeColumn(table, "approval_status").catch(() => {});
    }
    await queryInterface.dropTable("approval_config").catch(() => {});
  },
};
