"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningRootCause = sequelize.define(
    "MrPlanningRootCause",
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

      mr_planning_risk_analysis_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
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

      kode_penyebab: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      jenis_penyebab_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      jenis_penyebab: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      kategori_penyebab_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      kategori_penyebab: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      uraian_penyebab: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      why_1: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      why_2: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      why_3: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      why_4: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      why_5: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      akar_penyebab: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      rekomendasi_pengendalian: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      prioritas_penyebab: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_mitigation_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      mitigation_status: {
        type: DataTypes.STRING(100),
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

      is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

      metadata_json: {
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
      tableName: "mr_planning_root_cause",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningRootCause;
};