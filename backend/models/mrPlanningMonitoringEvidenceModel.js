"use strict";

/**
 * Model: MrPlanningMonitoringEvidence
 * ---------------------------------------------------------------------------
 * PHASE REPORT 2026 — STEP R17B-4C-4I
 * Monitoring/Realisasi — Bukti Realisasi Aktual Rencana Tindak Pengendalian
 *
 * Guard:
 * - Bukti realisasi aktual berbeda dari Dokumen RTP.
 * - Dokumen RTP berada di mr_planning_mitigation_documents.
 * - Bukti realisasi aktual berada di mr_planning_monitoring_evidence.
 * - Bukti wajib melekat ke monitoring/realisasi.
 * - Tidak ada hard delete.
 * - Pembatalan bukti memakai status_bukti + is_active + cancelled_*.
 */

module.exports = (sequelize, DataTypes) => {
  const MrPlanningMonitoringEvidence = sequelize.define(
    "MrPlanningMonitoringEvidence",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // =====================================================
      // RELASI UTAMA
      // =====================================================
      mr_planning_monitoring_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      mr_planning_mitigation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      mr_planning_risk_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // IDENTITAS BUKTI REALISASI
      // =====================================================
      evidence_type: {
        type: DataTypes.ENUM(
          "FOTO_KEGIATAN",
          "BERITA_ACARA",
          "NOTULEN",
          "LAPORAN_PROGRESS",
          "BUKTI_PERTANGGUNGJAWABAN",
          "BUKTI_PEMBAYARAN",
          "DOKUMENTASI_PELAKSANAAN",
          "BUKTI_TINDAK_LANJUT",
          "DOKUMEN_OUTPUT_AKTUAL",
          "BUKTI_VERIFIKASI"
        ),
        allowNull: false,
      },

      evidence_title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      evidence_number: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      evidence_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      realization_period: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      progress_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // =====================================================
      // FILE METADATA
      // =====================================================
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      original_file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },

      file_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },

      mime_type: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      file_size: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      storage_provider: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "local",
      },

      checksum: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },

      // =====================================================
      // STATUS / SOFT CANCEL
      // =====================================================
      status_bukti: {
        type: DataTypes.ENUM("aktif", "dibatalkan"),
        allowNull: false,
        defaultValue: "aktif",
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      uploaded_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      cancelled_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      cancel_reason: {
        type: DataTypes.TEXT,
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
      tableName: "mr_planning_monitoring_evidence",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningMonitoringEvidence;
};