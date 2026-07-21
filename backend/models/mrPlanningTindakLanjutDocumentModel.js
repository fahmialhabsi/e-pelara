"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningTindakLanjutDocument = sequelize.define(
    "MrPlanningTindakLanjutDocument",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_tindak_lanjut_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      mr_planning_temuan_rekomendasi_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      mr_planning_temuan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      document_type: {
        type: DataTypes.ENUM(
          "BUKTI_SETORAN",
          "SURAT_PERTANGGUNGJAWABAN",
          "BERITA_ACARA_TINDAK_LANJUT",
          "SK_PENERAPAN",
          "DOKUMEN_PENDUKUNG_LAINNYA"
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
      tableName: "mr_planning_tindak_lanjut_documents",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningTindakLanjutDocument;
};
