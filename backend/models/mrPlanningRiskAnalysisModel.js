"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningRiskAnalysis = sequelize.define(
    "MrPlanningRiskAnalysis",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_risk_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      mr_planning_context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
        allowNull: false,
        defaultValue: "tahunan",
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

      existing_control_status_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      existing_control_status: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      existing_control_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      control_adequacy_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      control_adequacy_status: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      control_adequacy_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      inherent_likelihood_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      inherent_impact_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      inherent_likelihood: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      inherent_impact: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      inherent_score: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      inherent_level_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      inherent_level: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      inherent_color: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      residual_likelihood_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      residual_impact_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      residual_likelihood: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      residual_impact: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      residual_score: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      residual_level_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      residual_level: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      residual_color: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      selera_risiko_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      selera_risiko: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      appetite_threshold: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      is_above_appetite: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      analysis_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      rekomendasi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      matrix_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      metadata_json: {
        type: DataTypes.JSON,
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

      status_revisi: {
        type: DataTypes.ENUM("draft", "verifikasi", "approved", "ditolak"),
        allowNull: false,
        defaultValue: "draft",
      },

      versi: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      alasan_revisi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      last_revised_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      last_revised_by: {
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

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      is_latest: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: "mr_planning_risk_analysis",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningRiskAnalysis;
};