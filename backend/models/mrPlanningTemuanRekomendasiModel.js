"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningTemuanRekomendasi = sequelize.define(
    "MrPlanningTemuanRekomendasi",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_temuan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      mr_planning_lhp_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      nomor_rekomendasi: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      kode_rekomendasi: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      uraian_rekomendasi: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      pihak_bertanggung_jawab: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      target_waktu_penyelesaian: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      nilai_rekomendasi_rupiah: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
      },

      urutan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      status_tindak_lanjut_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      status_tindak_lanjut: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      persentase_penyelesaian: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      tindak_lanjut_terakhir_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      tanggal_tindak_lanjut_terakhir: {
        type: DataTypes.DATEONLY,
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

      is_locked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      alasan_revisi: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      tableName: "mr_planning_temuan_rekomendasi",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningTemuanRekomendasi;
};
