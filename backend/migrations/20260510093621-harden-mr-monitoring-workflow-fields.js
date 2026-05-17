"use strict";

/**
 * Harden MR Planning Monitoring Workflow Fields
 *
 * Tujuan:
 * - Menyinkronkan field workflow/revisi/verifikasi/approval pada mr_planning_monitoring
 * - Mengatasi error smoke test:
 *   Unknown column 'versi' in 'field list'
 *
 * Guard:
 * - Idempotent
 * - Skip kolom jika sudah ada
 * - Tidak menghapus field existing
 * - Tidak menambahkan ulang created_by dan updated_by jika sudah ada
 * - Semua field baru dibuat nullable/default aman
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_planning_monitoring";
    const table = await queryInterface.describeTable(tableName);

    const addColumnIfNotExists = async (columnName, definition) => {
      if (!table[columnName]) {
        await queryInterface.addColumn(tableName, columnName, definition);
      }
    };

    await addColumnIfNotExists("versi", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "Nomor versi workflow/revisi monitoring MR",
    });

    await addColumnIfNotExists("status_revisi", {
      type: Sequelize.ENUM(
        "draft",
        "diajukan",
        "diverifikasi",
        "disetujui",
        "ditolak",
        "approved",
        "rejected"
      ),
      allowNull: true,
      defaultValue: "draft",
      comment: "Status workflow/revisi monitoring MR",
    });

    await addColumnIfNotExists("alasan_revisi", {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Alasan revisi atau catatan perubahan monitoring MR",
    });

    await addColumnIfNotExists("last_revised_at", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Waktu revisi terakhir monitoring MR",
    });

    await addColumnIfNotExists("last_revised_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User yang terakhir melakukan revisi monitoring MR",
    });

    await addColumnIfNotExists("dibuat_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User pembuat data monitoring MR",
    });

    await addColumnIfNotExists("diverifikasi_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User yang memverifikasi monitoring MR",
    });

    await addColumnIfNotExists("disetujui_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User yang menyetujui monitoring MR",
    });

    await addColumnIfNotExists("ditolak_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "User yang menolak monitoring MR",
    });

    await addColumnIfNotExists("dibuat_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Waktu pembuatan data monitoring MR",
    });

    await addColumnIfNotExists("diverifikasi_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Waktu verifikasi monitoring MR",
    });

    await addColumnIfNotExists("disetujui_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Waktu approval monitoring MR",
    });

    await addColumnIfNotExists("ditolak_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Waktu penolakan monitoring MR",
    });
  },

  async down(queryInterface, Sequelize) {
    const tableName = "mr_planning_monitoring";
    const table = await queryInterface.describeTable(tableName);

    const removeColumnIfExists = async (columnName) => {
      if (table[columnName]) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    };

    await removeColumnIfExists("ditolak_pada");
    await removeColumnIfExists("disetujui_pada");
    await removeColumnIfExists("diverifikasi_pada");
    await removeColumnIfExists("dibuat_pada");

    await removeColumnIfExists("ditolak_oleh");
    await removeColumnIfExists("disetujui_oleh");
    await removeColumnIfExists("diverifikasi_oleh");
    await removeColumnIfExists("dibuat_oleh");

    await removeColumnIfExists("last_revised_by");
    await removeColumnIfExists("last_revised_at");
    await removeColumnIfExists("alasan_revisi");

    await removeColumnIfExists("status_revisi");
    await removeColumnIfExists("versi");

    /**
     * Catatan:
     * created_by dan updated_by tidak dihapus di down()
     * karena field tersebut sudah existing sebelum migration ini.
     */
  },
};