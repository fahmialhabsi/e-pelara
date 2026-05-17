"use strict";

/**
 * Maximize Sync MR Existing Model Fields for Smoke Test
 *
 * Tujuan:
 * - Menutup mismatch field antara 12 model MR existing dan struktur DB aktual.
 * - Menghentikan pola smoke test gagal berantai karena Unknown column.
 *
 * Guard:
 * - Idempotent.
 * - Skip kolom jika sudah ada.
 * - Tidak menghapus field existing.
 * - Tidak membuat FK/index dulu.
 * - Semua field baru nullable/default aman.
 * - Tidak masuk frontend/export/dashboard/seeder.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const addColumnIfNotExists = async (tableName, columnName, definition) => {
      const table = await queryInterface.describeTable(tableName);

      if (!table[columnName]) {
        await queryInterface.addColumn(tableName, columnName, definition);
      }
    };

    // =====================================================
    // 1. mr_planning_approval_monitoring
    // Model membutuhkan metadata_json.
    // DB aktual belum memiliki metadata_json.
    // =====================================================
    await addColumnIfNotExists(
      "mr_planning_approval_monitoring",
      "metadata_json",
      {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Metadata tambahan approval monitoring MR dalam format JSON",
      }
    );

    // =====================================================
    // 2. mr_cross_system_link
    // Model membutuhkan updated_by.
    // DB aktual belum memiliki updated_by.
    // =====================================================
    await addColumnIfNotExists("mr_cross_system_link", "updated_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User terakhir yang memperbarui cross-system link MR",
    });

    // =====================================================
    // 3. mr_planning_deviation
    // Model membutuhkan opd_id.
    // DB aktual belum memiliki opd_id.
    // =====================================================
    await addColumnIfNotExists("mr_planning_deviation", "opd_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "OPD pemilik deviasi MR, dimapping dari context/renstra",
    });

    // =====================================================
    // 4. mr_planning_snapshot
    // Model membutuhkan created_by.
    // DB aktual belum memiliki created_by.
    // Catatan:
    // owner_user_id dan owner_division_id tetap TIDAK ditambahkan
    // karena ownership snapshot diturunkan dari context_id.
    // =====================================================
    await addColumnIfNotExists("mr_planning_snapshot", "created_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User pembuat snapshot MR",
    });

    // =====================================================
    // 5. mr_planning_warning
    // Model membutuhkan field status/read/resolution/owner/audit.
    // DB aktual belum memiliki field-field ini.
    // =====================================================
    await addColumnIfNotExists("mr_planning_warning", "warning_status", {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: "open",
      comment: "Status warning MR: open, read, resolved, archived",
    });

    await addColumnIfNotExists("mr_planning_warning", "is_read", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Penanda apakah warning MR sudah dibaca",
    });

    await addColumnIfNotExists("mr_planning_warning", "read_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User yang membaca warning MR",
    });

    await addColumnIfNotExists("mr_planning_warning", "read_at", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Waktu warning MR dibaca",
    });

    await addColumnIfNotExists("mr_planning_warning", "is_resolved", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Penanda apakah warning MR sudah diselesaikan",
    });

    await addColumnIfNotExists("mr_planning_warning", "resolved_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User yang menyelesaikan warning MR",
    });

    await addColumnIfNotExists("mr_planning_warning", "resolved_at", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Waktu warning MR diselesaikan",
    });

    await addColumnIfNotExists("mr_planning_warning", "resolution_note", {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Catatan penyelesaian warning MR",
    });

    await addColumnIfNotExists("mr_planning_warning", "owner_user_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User pemilik warning MR",
    });

    await addColumnIfNotExists("mr_planning_warning", "owner_division_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Divisi pemilik warning MR",
    });

    await addColumnIfNotExists("mr_planning_warning", "created_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User pembuat warning MR",
    });

    await addColumnIfNotExists("mr_planning_warning", "updated_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User terakhir yang memperbarui warning MR",
    });
  },

  async down(queryInterface) {
    const removeColumnIfExists = async (tableName, columnName) => {
      const table = await queryInterface.describeTable(tableName);

      if (table[columnName]) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    };

    // =====================================================
    // Reverse order
    // =====================================================
    await removeColumnIfExists("mr_planning_warning", "updated_by");
    await removeColumnIfExists("mr_planning_warning", "created_by");
    await removeColumnIfExists("mr_planning_warning", "owner_division_id");
    await removeColumnIfExists("mr_planning_warning", "owner_user_id");
    await removeColumnIfExists("mr_planning_warning", "resolution_note");
    await removeColumnIfExists("mr_planning_warning", "resolved_at");
    await removeColumnIfExists("mr_planning_warning", "resolved_by");
    await removeColumnIfExists("mr_planning_warning", "is_resolved");
    await removeColumnIfExists("mr_planning_warning", "read_at");
    await removeColumnIfExists("mr_planning_warning", "read_by");
    await removeColumnIfExists("mr_planning_warning", "is_read");
    await removeColumnIfExists("mr_planning_warning", "warning_status");

    await removeColumnIfExists("mr_planning_snapshot", "created_by");

    await removeColumnIfExists("mr_planning_deviation", "opd_id");

    await removeColumnIfExists("mr_cross_system_link", "updated_by");

    await removeColumnIfExists(
      "mr_planning_approval_monitoring",
      "metadata_json"
    );
  },
};