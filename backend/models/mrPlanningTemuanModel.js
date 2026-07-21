"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningTemuan = sequelize.define(
    "MrPlanningTemuan",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_lhp_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      context_id: {
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

      entitas_pemeriksa_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      entitas_pemeriksa: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      nomor_temuan: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      kode_temuan: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      judul_temuan: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      uraian_temuan: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      kondisi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      kriteria: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      sebab: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      akibat: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      nilai_temuan_rupiah: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
      },

      kategori_temuan_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      kategori_temuan: {
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

      jumlah_rekomendasi: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      jumlah_rekomendasi_selesai: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      status_rollup: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      risk_escalation_status: {
        type: DataTypes.ENUM("none", "risk_created"),
        allowNull: false,
        defaultValue: "none",
      },

      mr_planning_risk_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      cross_system_link_id: {
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
      tableName: "mr_planning_temuan",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningTemuan;
};
