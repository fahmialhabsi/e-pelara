"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningContext = sequelize.define(
    "MrPlanningContext",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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

      periode_penerapan: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      jenis_dokumen: {
        type: DataTypes.STRING(100),
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

      nama_opd: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      pemilik_risiko_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      nama_pemilik_risiko: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      jabatan_pemilik_risiko: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      koordinator_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      nama_koordinator: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      jabatan_koordinator: {
        type: DataTypes.STRING(255),
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

      nama_unit_kerja: {
        type: DataTypes.STRING(255),
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

      risk_appetite_note: {
        type: DataTypes.TEXT,
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
      tableName: "mr_planning_context",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningContext;
};