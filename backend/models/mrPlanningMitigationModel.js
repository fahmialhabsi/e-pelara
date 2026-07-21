'use strict';

module.exports = (sequelize, DataTypes) => {
  const MrPlanningMitigation = sequelize.define(
    'MrPlanningMitigation',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // =====================================================
      // RELASI UTAMA
      // =====================================================
      mr_planning_risk_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      risk_analysis_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      root_cause_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // MITIGATION CORE
      // =====================================================
      uraian_mitigasi: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      jenis_mitigasi: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      respon_risiko_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      respon_risiko: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      unsur_spip_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      unsur_spip: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      sub_unsur_spip_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      sub_unsur_spip: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      output_rtp_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      output_rtp: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      kegiatan_pengendalian: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      target_output: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      indikator_keluaran: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      target_keluaran: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      satuan_keluaran: {
        type: DataTypes.STRING(100),
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
      // WAKTU / TARGET
      // =====================================================
      target_tanggal: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      tanggal_mulai: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      tanggal_selesai: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      target_waktu_mulai: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      target_waktu_selesai: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // =====================================================
      // RISIKO SETELAH MITIGASI
      // =====================================================
      risk_after_mitigation_likelihood_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      risk_after_mitigation_impact_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      risk_after_mitigation_likelihood: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      risk_after_mitigation_impact: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      risk_after_mitigation_score: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      risk_after_mitigation_level_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      risk_after_mitigation_level: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      risk_after_mitigation_color: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      is_above_appetite_after_mitigation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      // =====================================================
      // SPIP / RTP / CROSS SYSTEM LINKAGE
      // =====================================================
      requires_spip_rtp: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      spip_link_status: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      linked_spip_rtp_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      linked_spip_monitoring_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      linked_spip_evidence_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      cross_system_link_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // OWNERSHIP / STATUS
      // =====================================================
      penanggung_jawab: {
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

      status_mitigasi: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      progress_persen: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      kendala: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      tindak_lanjut: {
        type: DataTypes.TEXT,
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
        type: DataTypes.ENUM('draft', 'verifikasi', 'approved', 'ditolak'),
        allowNull: false,
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
      tableName: 'mr_planning_mitigation',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return MrPlanningMitigation;
};
