"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningApprovalMonitoring = sequelize.define(
    "MrPlanningApprovalMonitoring",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // =====================================================
      // RELASI / SOURCE
      // =====================================================
      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      mr_planning_risk_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      module_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      record_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      entity_type: {
        type: DataTypes.ENUM(
          "context",
          "risk",
          "analysis",
          "mitigation",
          "monitoring",
          "evaluation",
          "deviation",
          "warning",
          "snapshot",
          "dashboard_summary",
          "report_export"
        ),
        allowNull: true,
      },

      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      source_table: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      source_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      workflow_type: {
        type: DataTypes.ENUM(
          "context",
          "risk",
          "analysis",
          "mitigation",
          "monitoring",
          "evaluation",
          "deviation",
          "warning",
          "snapshot",
          "dashboard_summary",
          "report_export",
          "adhoc"
        ),
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

      // =====================================================
      // APPROVAL CORE
      // =====================================================
      status_revisi: {
        type: DataTypes.ENUM("draft", "verifikasi", "approved", "ditolak"),
        allowNull: false,
        defaultValue: "draft",
      },

      approval_stage: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      current_step: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      approval_sequence: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      submitted_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      verified_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      rejected_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      rejected_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      approval_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      is_locked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      audit_event_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      metadata_json: {
        type: DataTypes.JSON,
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
      tableName: "mr_planning_approval_monitoring",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningApprovalMonitoring;
};