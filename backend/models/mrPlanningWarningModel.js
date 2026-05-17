// backend/models/MrPlanningWarningModel.js
"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningWarning = sequelize.define(
    "MrPlanningWarning",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // =====================================================
      // RELASI UTAMA
      // =====================================================
      mr_planning_risk_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      mr_planning_mitigation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      mr_planning_monitoring_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      related_snapshot_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // PERIODISASI
      // =====================================================
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

      tahun: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // WARNING CORE
      // =====================================================
      warning_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      warning_type: {
        type: DataTypes.ENUM(
          "risk_level",
          "deviation",
          "overdue",
          "approval_pending",
          "mitigation_pending",
          "monitoring_pending",
          "broken_chain",
          "duplicate_data",
          "cross_system",
          "risk_above_appetite",
          "mitigation_overdue",
          "monitoring_overdue",
          "risk_event_occurred",
          "control_not_effective",
          "approval_delay",
          "snapshot_generation_failed",
          "deviation_high",
          "evaluation_overdue",
          "system_sync_failed"
        ),
        allowNull: false,
      },

      warning_level: {
        type: DataTypes.ENUM("low", "medium", "high", "critical"),
        allowNull: false,
        defaultValue: "low",
      },

      warning_message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      warning_source: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      severity_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      due_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      days_overdue: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },

      warning_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "open",
      },

      // =====================================================
      // SOURCE
      // =====================================================
      source_table: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      source_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // READ / RESOLUTION
      // =====================================================
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      read_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      read_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      is_resolved: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      resolved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      resolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      resolution_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // =====================================================
      // OWNERSHIP
      // =====================================================
      owner_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      owner_division_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // AUDIT
      // =====================================================
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "mr_planning_warning",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningWarning;
};