'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DpaPergeseranItem extends Model {}
  DpaPergeseranItem.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pergeseran_id: { type: DataTypes.INTEGER, allowNull: false },
      jenis: { type: DataTypes.ENUM('KURANG', 'TAMBAH'), allowNull: false },
      kode_rekening: { type: DataTypes.STRING(50), allowNull: false },
      nama_rekening: { type: DataTypes.STRING(255), allowNull: true },
      uraian: { type: DataTypes.STRING(255), allowNull: true },
      jumlah_semula: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
      volume_semula: { type: DataTypes.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      satuan_semula: { type: DataTypes.STRING(50), allowNull: true },
      harga_satuan_semula: { type: DataTypes.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      jumlah_pergeseran: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
      jumlah_menjadi: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
      volume_menjadi: { type: DataTypes.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      satuan_menjadi: { type: DataTypes.STRING(50), allowNull: true },
      harga_satuan_menjadi: { type: DataTypes.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      kode_sub_kegiatan_asal: { type: DataTypes.STRING(50), allowNull: true },
      kode_sub_kegiatan_tujuan: { type: DataTypes.STRING(50), allowNull: true },
      dpa_tujuan_id: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DpaPergeseranItem',
      tableName: 'dpa_pergeseran_item',
      underscored: true,
      timestamps: false,
    },
  );
  return DpaPergeseranItem;
};
