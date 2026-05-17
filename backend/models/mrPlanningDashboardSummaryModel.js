"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningDashboardSummary = sequelize.define(
    "MrPlanningDashboardSummary",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // =====================================================
      // RELASI / TIPE SUMMARY
      // =====================================================
      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      summary_type: {
        type: DataTypes.ENUM(
          "executive",
          "opd",
          "renstra",
          "risk_owner",
          "operasional",
          "snapshot",
          "adhoc"
        ),
        allowNull: false,
        defaultValue: "executive",
      },

      last_snapshot_id: {
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
        allowNull: false,
      },

      periode_label: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      tahun: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // SCOPE
      // =====================================================
      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      opd_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // RISK SUMMARY
      // =====================================================
      risk_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      risk_priority_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      risk_above_appetite_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      risk_below_appetite_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      risk_high: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      risk_medium: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      risk_low: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      // =====================================================
      // MITIGATION / MONITORING / EVENT SUMMARY
      // =====================================================
      mitigation_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      mitigation_done: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      mitigation_pending: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      mitigation_overdue: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      monitoring_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      risk_event_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      control_effective_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      control_not_effective_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      // =====================================================
      // DEVIATION / WARNING / APPROVAL SUMMARY
      // =====================================================
      deviation_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      warning_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      approval_pending: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      approval_approved: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      approval_rejected: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      // =====================================================
      // JSON SUMMARY / TREND
      // =====================================================
      summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      risk_trend_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      mitigation_trend_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      monitoring_trend_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      warning_trend_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      approval_trend_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      snapshot_summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      // =====================================================
      // SYNC / GENERATED
      // =====================================================
      last_sync_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      last_generated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      sync_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "pending",
      },

      generated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "mr_planning_dashboard_summary",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningDashboardSummary;
};