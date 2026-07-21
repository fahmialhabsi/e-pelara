"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningTemuanHistory = sequelize.define(
    "MrPlanningTemuanHistory",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_temuan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      versi_sebelum: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      versi_sesudah: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      before_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      after_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      alasan_revisi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      status_revisi: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      action_type: {
        type: DataTypes.ENUM(
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
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      audit_event_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      dibuat_oleh: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      diverifikasi_oleh: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      disetujui_oleh: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      ditolak_oleh: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      dibuat_pada: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      diverifikasi_pada: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      disetujui_pada: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      ditolak_pada: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "mr_planning_temuan_history",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningTemuanHistory;
};
