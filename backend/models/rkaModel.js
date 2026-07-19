// File: models/Rka.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Rka extends Model {
    static associate(models) {
      Rka.belongsTo(models.PeriodeRpjmd, {
        foreignKey: 'periode_id',
        as: 'periode',
      });
      Rka.belongsTo(models.Renja, {
        foreignKey: 'renja_id',
        as: 'renja',
      });
      Rka.hasMany(models.RkaVersion, {
        foreignKey: 'rka_id',
        as: 'versions',
      });
      Rka.hasMany(models.RkaRincianBelanja, {
        foreignKey: 'rka_id',
        as: 'rincianBelanja',
        onDelete: 'CASCADE',
      });
    }
  }

  Rka.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      opd_id: {
        // Memastikan OPD terdokumentasi di level sub-kegiatan
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      urusan: { type: DataTypes.STRING(255), allowNull: true },
      kode_urusan: { type: DataTypes.STRING(10), allowNull: true },
      bidang_urusan: { type: DataTypes.STRING(255), allowNull: true },
      kode_bidang_urusan: { type: DataTypes.STRING(10), allowNull: true },
      program: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sub_kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // Mengunci kombinasi unik per tahapan belanja
      kode_unik_sub_kegiatan: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      // Fitur Unggulan: State Machine Tahapan Anggaran pembentuk pergeseran/perubahan
      tahapan: {
        type: DataTypes.ENUM('APBD_INDUK', 'PERGESERAN_1', 'PERGESERAN_2', 'APBD_PERUBAHAN'),
        allowNull: false,
        defaultValue: 'APBD_INDUK',
      },
      indikator: DataTypes.STRING,
      target: DataTypes.STRING,
      anggaran: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      jenis_dokumen: DataTypes.STRING,
      renja_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      change_reason_text: { type: DataTypes.TEXT, allowNull: true },
      change_reason_file: { type: DataTypes.STRING(255), allowNull: true },
      version: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      is_active_version: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      rpjmd_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      approval_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      pagu_year_1: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_2: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_3: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_4: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_5: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_total: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      // Indikator & Tolok Ukur Kinerja (Permendagri 77/2020)
      kode_program: { type: DataTypes.STRING(50), allowNull: true },
      kode_kegiatan: { type: DataTypes.STRING(50), allowNull: true },
      kode_sub_kegiatan: { type: DataTypes.STRING(50), allowNull: true },
      capaian_program: { type: DataTypes.TEXT, allowNull: true },
      target_capaian: { type: DataTypes.STRING(100), allowNull: true },
      satuan_capaian: { type: DataTypes.STRING(50), allowNull: true },
      masukan: { type: DataTypes.TEXT, allowNull: true },
      keluaran: { type: DataTypes.TEXT, allowNull: true },
      target_keluaran: { type: DataTypes.STRING(100), allowNull: true },
      satuan_keluaran: { type: DataTypes.STRING(50), allowNull: true },
      hasil: { type: DataTypes.TEXT, allowNull: true },
      target_hasil: { type: DataTypes.STRING(100), allowNull: true },
      satuan_hasil: { type: DataTypes.STRING(50), allowNull: true },
      waktu_mulai: { type: DataTypes.STRING(20), allowNull: true },
      waktu_selesai: { type: DataTypes.STRING(20), allowNull: true },
      lokasi: { type: DataTypes.STRING(255), allowNull: true },
      // Keterangan: rincian_belanja bertipe JSON disini DIHAPUS untuk mencegah dual-source of truth.
    },
    {
      sequelize,
      modelName: 'Rka',
      tableName: 'rka',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return Rka;
};
