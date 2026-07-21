'use strict';

module.exports = (sequelize, DataTypes) => {
  const MrPlanningMonitoring = sequelize.define(
    'MrPlanningMonitoring',
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

      mr_planning_mitigation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // PERIODISASI
      // =====================================================
      // periode_id: {
      //   type: DataTypes.INTEGER,
      //   allowNull: true,
      // },

      tahun: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      periode_type: {
        type: DataTypes.ENUM('bulanan', 'triwulan', 'semester', 'tahunan', 'adhoc'),
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

      monitoring_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      // =====================================================
      // MONITORING KEGIATAN PENGENDALIAN
      // =====================================================
      target_waktu: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      realisasi_waktu: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      status_realisasi_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      status_realisasi: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      status_monitoring: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      hasil_monitoring: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      output_realisasi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      realisasi_mitigasi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      persentase_realisasi: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
      },

      progress_persen: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      hambatan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      kendala: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      tindak_lanjut: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      catatan_monitoring: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      rekomendasi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      monitoring_cycle: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      monitoring_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // RISK EVENT / PERISTIWA RISIKO
      // =====================================================
      terjadi_risiko: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      tanggal_kejadian: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      tempat_kejadian: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      uraian_kejadian: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      uraian_peristiwa: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      pemicu_kejadian: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      dampak_kejadian: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      dampak_aktual: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      skor_dampak_aktual: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      kode_penyebab_kejadian: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      jenis_penyebab_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      tindak_lanjut_kejadian: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // =====================================================
      // ACTUAL RISK LEVEL
      // =====================================================
      actual_likelihood_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      actual_impact_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      actual_likelihood: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      actual_impact: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      actual_score: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      actual_level_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      actual_level: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      actual_color: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      level_change: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      risk_trend: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      is_above_appetite_actual: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      // =====================================================
      // EFEKTIVITAS PENGENDALIAN
      // =====================================================
      hasil_pengendalian: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      efektivitas_pengendalian_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      efektivitas_pengendalian: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      perubahan_level_risiko: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      rekomendasi_evaluasi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      komentar_pemilik_risiko: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      tanggal_evaluasi: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      evaluator_user_id: {
        type: DataTypes.INTEGER,
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
      // WORKFLOW
      // =====================================================
      versi: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      status_revisi: {
        type: DataTypes.ENUM(
          'draft',
          'diajukan',
          'diverifikasi',
          'disetujui',
          'ditolak',
          'approved',
          'rejected',
        ),
        allowNull: true,
        defaultValue: 'draft',
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
      tableName: 'mr_planning_monitoring',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return MrPlanningMonitoring;
};
