'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SdiDaftarData extends Model {
    static associate(models) {
      SdiDaftarData.belongsTo(models.RenstraOPD, {
        foreignKey: 'renstra_id',
        targetKey: 'id',
        constraints: false,
        as: 'renstra',
      });
    }
  }

  SdiDaftarData.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      renstra_id: DataTypes.INTEGER,
      tahun: { type: DataTypes.STRING(4), allowNull: false },
      nama_opd: DataTypes.STRING(150),
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

      indikator_renstra_id: DataTypes.INTEGER,
      sumber_tarikan: {
        type: DataTypes.ENUM('manual', 'renstra'),
        allowNull: false,
        defaultValue: 'manual',
      },

      // Atribut Lampiran (1)-(19)
      id_ddd: DataTypes.STRING(30),
      id_ddp: DataTypes.STRING(30),
      // Membedakan "belum diperiksa" dari "sudah dipastikan tidak mengacu
      // Data Pusat" — keduanya sama-sama berkolom ID DDP kosong.
      id_ddp_status: {
        type: DataTypes.ENUM('belum_dicek', 'mengacu', 'tidak_mengacu'),
        allowNull: false,
        defaultValue: 'belum_dicek',
      },
      sumber_referensi: DataTypes.TEXT,
      kode_indikator: DataTypes.STRING(100),
      nama_indikator: DataTypes.TEXT,
      nama_data: { type: DataTypes.TEXT, allowNull: false },
      jenis_data: {
        type: DataTypes.ENUM('statistik', 'geospasial', 'keuangan'),
        allowNull: false,
        defaultValue: 'statistik',
      },
      indikator_variabel: {
        type: DataTypes.ENUM('indikator', 'variabel'),
        allowNull: false,
        defaultValue: 'indikator',
      },
      kode_standar_data: DataTypes.STRING(100),
      produsen_data: DataTypes.STRING(150),
      klasifikasi_risiko: {
        type: DataTypes.ENUM('terbuka', 'terbatas', 'tertutup'),
        allowNull: false,
        defaultValue: 'terbuka',
      },
      definisi: DataTypes.TEXT,
      satuan: DataTypes.STRING(50),
      klasifikasi_penyajian: DataTypes.STRING(255),
      jadwal_pemutakhiran: {
        type: DataTypes.ENUM(
          'harian',
          'mingguan',
          'bulanan',
          'triwulanan',
          'semesteran',
          'tahunan',
          'insidental',
        ),
        allowNull: false,
        defaultValue: 'tahunan',
      },
      kategori_rad: DataTypes.STRING(255),
      kode_metadata: DataTypes.STRING(255),
      link_portal_daerah: DataTypes.TEXT,
      link_portal_sdi: DataTypes.TEXT,

      // Atribut tambahan pemenuh metadata Standar Data Indonesia.
      metode_pengumpulan: DataTypes.TEXT,
      periode_data: DataTypes.STRING(100),
      penanggung_jawab: DataTypes.STRING(150),

      status: {
        type: DataTypes.ENUM('draft', 'diverifikasi', 'final'),
        allowNull: false,
        defaultValue: 'draft',
      },
      catatan: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'SdiDaftarData',
      tableName: 'sdi_daftar_data',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return SdiDaftarData;
};
