"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningMitigationDocument = sequelize.define(
    "MrPlanningMitigationDocument",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // =====================================================
      // RELASI UTAMA
      // =====================================================
      mr_planning_mitigation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      // IDENTITAS DOKUMEN RENCANA TINDAK PENGENDALIAN
      // =====================================================
      document_type: {
        type: DataTypes.ENUM(
          "SK_TIM_TINDAK_LANJUT",
          "SURAT_TUGAS_TIM_TINDAK_LANJUT",
          "RENCANA_AKSI",
          "DOKUMEN_PENDUKUNG_RENCANA"
        ),
        allowNull: false,
      },

      document_title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      document_number: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      document_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // =====================================================
      // METADATA DOKUMEN
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
        allowNull: false,
      },

      file_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
      // STATUS DOKUMEN
      // =====================================================
      status_dokumen: {
        type: DataTypes.ENUM("draft", "aktif", "dibatalkan"),
        allowNull: false,
        defaultValue: "aktif",
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      // =====================================================
      // AKTOR DAN WAKTU
      // =====================================================
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
      tableName: "mr_planning_mitigation_documents",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningMitigationDocument;
};