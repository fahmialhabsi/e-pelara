'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RenjaInovasiBidangUrusan extends Model {
    static associate(models) {
      RenjaInovasiBidangUrusan.belongsTo(models.PerangkatDaerah, {
        foreignKey: 'perangkat_daerah_id',
        as: 'perangkatDaerah',
      });
    }
  }

  RenjaInovasiBidangUrusan.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tahun: { type: DataTypes.STRING(4), allowNull: false },
      perangkat_daerah_id: { type: DataTypes.INTEGER, allowNull: false },
      nama_inovasi: { type: DataTypes.STRING(255), allowNull: false },
      bentuk_inovasi: { type: DataTypes.STRING(150), allowNull: true },
      deskripsi: { type: DataTypes.TEXT, allowNull: true },
      tahun_mulai: { type: DataTypes.STRING(4), allowNull: true },
      manfaat: { type: DataTypes.TEXT, allowNull: true },
      jumlah: { type: DataTypes.INTEGER, allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      catatan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'RenjaInovasiBidangUrusan',
      tableName: 'renja_inovasi_bidang_urusan',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return RenjaInovasiBidangUrusan;
};
