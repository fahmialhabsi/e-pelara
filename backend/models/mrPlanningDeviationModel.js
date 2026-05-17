"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningDeviation = sequelize.define(
    "MrPlanningDeviation",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // =====================================================
      // RELASI UTAMA
      // =====================================================
      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      mr_planning_risk_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      mr_planning_monitoring_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      risk_event_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // SCOPE LEGACY / PLANNING
      // =====================================================
      indikator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      stage: {
        type: DataTypes.ENUM(
          "tujuan",
          "sasaran",
          "strategi",
          "kebijakan",
          "program",
          "kegiatan",
          "sub_kegiatan",
          "lakip",
          "lk"
        ),
        allowNull: false,
      },

      ref_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      opd_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // PERIODISASI
      // =====================================================
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

      // =====================================================
      // DEVIATION CORE
      // =====================================================
      deviation_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      deviation_source: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      deviation_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      expected_value: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      actual_value: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      deviation_value: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      deviation_percent: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      // =====================================================
      // TARGET/PAGU LEGACY DEVIATION
      // =====================================================
      target_awal: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      target_realisasi: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      deviasi_target: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      persen_deviasi_target: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      pagu_awal: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      pagu_realisasi: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      deviasi_pagu: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      persen_deviasi_pagu: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      // =====================================================
      // RISK LEVEL / APPETITE CHANGE
      // =====================================================
      risk_level_before: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      risk_level_after: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      risk_level_change: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      is_above_appetite: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      // =====================================================
      // SEVERITY / FOLLOW UP
      // =====================================================
      severity_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      severity_level: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      severity_color: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      level_deviasi: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      recommendation: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      rekomendasi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      follow_up_status: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      warning_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      // =====================================================
      // OWNERSHIP / SOURCE
      // =====================================================
      owner_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      owner_division_id: {
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

      calculated_at: {
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
      tableName: "mr_planning_deviation",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningDeviation;
};