"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningReportExport = sequelize.define(
    "MrPlanningReportExport",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      snapshot_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      dashboard_summary_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      report_code: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      report_title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      report_type: {
        type: DataTypes.ENUM(
          "risk_register",
          "risk_profile",
          "risk_map",
          "mitigation",
          "monitoring",
          "deviation",
          "warning",
          "dashboard",
          "snapshot",
          "executive_summary",
          "spip_linkage",
          "adhoc"
        ),
        allowNull: false,
        defaultValue: "adhoc",
      },

      export_format: {
        type: DataTypes.ENUM("excel", "docx", "pdf", "json", "html"),
        allowNull: false,
        defaultValue: "excel",
      },

      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      tahun: {
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

      periode_awal: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      periode_akhir: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      opd_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      owner_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      owner_division_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      file_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      file_path: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      file_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      file_mime_type: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      file_size: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      storage_provider: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      storage_key: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      generate_status: {
        type: DataTypes.ENUM(
          "pending",
          "processing",
          "success",
          "failed",
          "cancelled",
          "expired"
        ),
        allowNull: false,
        defaultValue: "pending",
      },

      generated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      generated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      expired_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      approval_status: {
        type: DataTypes.ENUM(
          "draft",
          "submitted",
          "verified",
          "approved",
          "rejected",
          "archived"
        ),
        allowNull: false,
        defaultValue: "draft",
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

      rejection_reason: {
        type: DataTypes.TEXT,
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

      source_system: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "e_pelara",
      },

      target_system: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      cross_system_link_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      metadata_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      filter_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

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
      tableName: "mr_planning_report_export",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningReportExport;
};