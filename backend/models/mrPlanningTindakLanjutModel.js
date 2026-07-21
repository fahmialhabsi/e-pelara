"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningTindakLanjut = sequelize.define(
    "MrPlanningTindakLanjut",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_temuan_rekomendasi_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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

      periode_pemantauan_type: {
        type: DataTypes.ENUM("bulanan", "triwulan", "semester", "tahunan", "adhoc"),
        allowNull: false,
        defaultValue: "adhoc",
      },

      periode_pemantauan_label: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      tanggal_pemantauan: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      status_tindak_lanjut_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      status_tindak_lanjut: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      uraian_tindak_lanjut: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      persentase_penyelesaian: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      nilai_setoran_rupiah: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
      },

      nomor_bukti_setoran: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      tanggal_setoran: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      kendala: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      alasan_tidak_dapat_ditindaklanjuti: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      rencana_tindak_lanjut_berikutnya: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      target_waktu_berikutnya: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      pic_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      pic_nama: {
        type: DataTypes.STRING(255),
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

      is_latest: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: "mr_planning_tindak_lanjut",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningTindakLanjut;
};
