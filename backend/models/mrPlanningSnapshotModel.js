"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningSnapshot = sequelize.define(
    "MrPlanningSnapshot",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // =====================================================
      // RELASI / IDENTITAS SNAPSHOT
      // =====================================================
      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      snapshot_type: {
        type: DataTypes.ENUM(
          "risk",
          "mitigation",
          "monitoring",
          "deviation",
          "warning",
          "dashboard",
          "report",
          "executive",
          "adhoc"
        ),
        allowNull: false,
        defaultValue: "risk",
      },

      snapshot_code: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      snapshot_date: {
        type: DataTypes.DATE,
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

      periode_awal: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      periode_akhir: {
        type: DataTypes.DATEONLY,
        allowNull: true,
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
      // SUMMARY ANGKA RISIKO
      // =====================================================
      total_risk: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_priority_risk: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_risk_above_appetite: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_risk_below_appetite: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_high_risk: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_medium_risk: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_low_risk: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      // =====================================================
      // SUMMARY MITIGATION / MONITORING
      // =====================================================
      total_mitigation: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_mitigation_done: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_mitigation_pending: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_mitigation_overdue: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_mitigated: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_unmitigated: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_overdue: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_monitoring: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_risk_event: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_control_effective: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_control_not_effective: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      // =====================================================
      // SUMMARY WARNING / DEVIATION / APPROVAL
      // =====================================================
      total_warning: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_deviation: {
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
      // JSON SNAPSHOT
      // =====================================================
      snapshot_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      risk_map_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      priority_risk_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      mitigation_summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      monitoring_summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      event_summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      effectiveness_summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      warning_summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      deviation_summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      approval_summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      // =====================================================
      // GENERATE / LOCK
      // =====================================================
      generated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      generated_at: {
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

      is_locked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      locked_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      locked_at: {
        type: DataTypes.DATE,
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
      tableName: "mr_planning_snapshot",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningSnapshot;
};