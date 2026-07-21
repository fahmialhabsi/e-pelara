"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningLhp = sequelize.define(
    "MrPlanningLhp",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      entitas_pemeriksa_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      entitas_pemeriksa: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      jenis_pemeriksaan_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      jenis_pemeriksaan: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      nomor_lhp: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      judul_lhp: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      tanggal_lhp: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      tahun_lhp: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      tahun: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      ringkasan_lhp: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      periode_pemeriksaan_awal: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      periode_pemeriksaan_akhir: {
        type: DataTypes.DATEONLY,
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

      surat_tugas_nomor: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      surat_tugas_tanggal: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      tanggal_terima_lhp: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      batas_waktu_tindak_lanjut: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      jumlah_temuan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      jumlah_rekomendasi: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      // =====================================================
      // METADATA DOKUMEN (LHP = 1 berkas per record)
      // =====================================================
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      original_file_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      file_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
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
        type: DataTypes.ENUM("draft", "aktif", "diarsipkan"),
        allowNull: false,
        defaultValue: "draft",
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

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      dibuat_oleh: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      dibuat_pada: {
        type: DataTypes.DATE,
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

      alasan_revisi: {
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
      tableName: "mr_planning_lhp",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningLhp;
};
