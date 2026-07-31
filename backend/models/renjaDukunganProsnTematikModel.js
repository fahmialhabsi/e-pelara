'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RenjaDukunganProsnTematik extends Model {
    static associate(models) {
      RenjaDukunganProsnTematik.belongsTo(models.PerangkatDaerah, {
        foreignKey: 'perangkat_daerah_id',
        as: 'perangkatDaerah',
      });
      RenjaDukunganProsnTematik.belongsTo(models.RenjaProSnMaster, {
        foreignKey: 'pro_sn_master_id',
        as: 'proSnMaster',
      });
    }
  }

  RenjaDukunganProsnTematik.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      // Null untuk baris referensi Rakortekbang 2026 — daftar nasional itu
      // tidak terikat tahun maupun perangkat daerah.
      tahun: { type: DataTypes.STRING(4), allowNull: true },
      perangkat_daerah_id: { type: DataTypes.INTEGER, allowNull: true },
      jenis: {
        type: DataTypes.ENUM('pro_sn', 'tematik'),
        allowNull: false,
      },
      sumber: {
        type: DataTypes.ENUM('rakortekbang_2026', 'opd'),
        allowNull: false,
        defaultValue: 'rakortekbang_2026',
      },
      pro_sn_master_id: { type: DataTypes.INTEGER, allowNull: true },
      pro_sn: { type: DataTypes.STRING(150), allowNull: true },
      proyek_kegiatan: { type: DataTypes.STRING(255), allowNull: true },
      tematik_pembangunan: { type: DataTypes.STRING(255), allowNull: true },
      outcome: { type: DataTypes.TEXT, allowNull: true },
      indikator_outcome: { type: DataTypes.TEXT, allowNull: true },
      satuan: { type: DataTypes.STRING(50), allowNull: true },
      pengampu_bidang_urusan_utama: { type: DataTypes.STRING(150), allowNull: true },
      bidang_urusan_terkait: { type: DataTypes.STRING(150), allowNull: true },
      program: { type: DataTypes.STRING(255), allowNull: true },
      kode: { type: DataTypes.STRING(100), allowNull: true },
      // Awalan kode subkegiatan (mis. "2.09") — kunci penyaring per bidang urusan.
      kode_bidang_urusan: { type: DataTypes.STRING(10), allowNull: true },
      sub_kegiatan: { type: DataTypes.TEXT, allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      catatan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'RenjaDukunganProsnTematik',
      tableName: 'renja_dukungan_prosn_tematik',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return RenjaDukunganProsnTematik;
};
