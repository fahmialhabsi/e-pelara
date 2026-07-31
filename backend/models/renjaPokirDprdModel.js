'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RenjaPokirDprd extends Model {
    static associate(models) {
      RenjaPokirDprd.belongsTo(models.PerangkatDaerah, {
        foreignKey: 'perangkat_daerah_id',
        as: 'perangkatDaerah',
      });
    }
  }

  RenjaPokirDprd.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tahun: { type: DataTypes.STRING(4), allowNull: false },
      perangkat_daerah_id: { type: DataTypes.INTEGER, allowNull: false },
      nama_anggota_dprd: { type: DataTypes.STRING(150), allowNull: true },
      dapil: { type: DataTypes.STRING(100), allowNull: true },
      usulan: { type: DataTypes.TEXT, allowNull: false },
      lokasi: { type: DataTypes.STRING(255), allowNull: true },
      program_kegiatan_terkait: { type: DataTypes.STRING(255), allowNull: true },
      nilai_usulan_anggaran: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      catatan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'RenjaPokirDprd',
      tableName: 'renja_pokir_dprd',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return RenjaPokirDprd;
};
