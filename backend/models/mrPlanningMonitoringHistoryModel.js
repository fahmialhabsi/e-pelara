"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningMonitoringHistory = sequelize.define(
    "MrPlanningMonitoringHistory",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_monitoring_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      mr_planning_risk_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      mr_planning_mitigation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      periode_type: {
        type: DataTypes.ENUM(
          "bulanan",
          "triwulan",
          "semester",
          "tahunan",
          "adhoc"
        ),
        allowNull: true,
      },

      periode_label: {
        type: DataTypes.STRING(100),
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
      tableName: "mr_planning_monitoring_history",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningMonitoringHistory;
};