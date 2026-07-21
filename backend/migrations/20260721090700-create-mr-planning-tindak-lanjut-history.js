"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_tindak_lanjut_history", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_tindak_lanjut_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_planning_tindak_lanjut",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      context_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      versi_sebelum: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      versi_sesudah: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      before_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      after_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      alasan_revisi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      status_revisi: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      action_type: {
        type: Sequelize.ENUM(
          "create",
          "update",
          "revisi",
          "verifikasi",
          "approve",
          "tolak",
          "rebuild",
          "restore",
          "sync",
          "import",
          "system"
        ),
        allowNull: true,
      },

      source_module: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      audit_event_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      dibuat_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      diverifikasi_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      disetujui_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      ditolak_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      dibuat_pada: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      diverifikasi_pada: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      disetujui_pada: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      ditolak_pada: {
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

    await queryInterface.addIndex("mr_planning_tindak_lanjut_history", ["mr_planning_tindak_lanjut_id"]);
    await queryInterface.addIndex("mr_planning_tindak_lanjut_history", ["status_revisi"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_tindak_lanjut_history");
  },
};
