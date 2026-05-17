"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningRisk = sequelize.define(
    "MrPlanningRisk",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // =====================================================
      // CONTEXT / PERIOD / SCOPE
      // =====================================================
      context_id: {
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

      indikator_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
          "lk",
          "temuan_bpk",
          "temuan_inspektorat",
          "pelaksanaan_kegiatan",
          "pertanggungjawaban_keuangan",
          "spip_e_sigap",
          "manual_adhoc",
          "lainnya"
        ),
        allowNull: false,
      },

      ref_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // =====================================================
      // RISK REGISTER CORE
      // =====================================================
      kode_risiko: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      nama_risiko: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      risk_statement: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      uraian_risiko: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      kategori_risiko_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      kategori_risiko: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      sumber_risiko_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      sumber_risiko: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      penyebab_risiko: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      dampak_risiko: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      metode_pencapaian_tujuan_spip: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      risk_code_auto_generated: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      is_priority_candidate: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      // =====================================================
      // RISK SCORING / MATRIX
      // =====================================================
      kemungkinan_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      dampak_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      kemungkinan: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      dampak: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      skor_risiko: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      level_risiko_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      level_risiko: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      // warna_risiko: {
      //   type: DataTypes.STRING(50),
      //   allowNull: true,
      // },

      selera_risiko_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      selera_risiko: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      is_above_appetite: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      matrix_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      matrix_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // STATUS / OWNERSHIP
      // =====================================================
      status_risiko_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      status_risiko: {
        type: DataTypes.STRING(50),
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

      // =====================================================
      // WORKFLOW
      // =====================================================
      versi: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      status_revisi: {
        type: DataTypes.ENUM("draft", "verifikasi", "approved", "ditolak"),
        allowNull: false,
        defaultValue: "draft",
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
      tableName: "mr_planning_risk",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningRisk;
};