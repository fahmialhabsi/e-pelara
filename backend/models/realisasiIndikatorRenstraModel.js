'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RealisasiIndikatorRenstra extends Model {
    static associate(models) {
      RealisasiIndikatorRenstra.belongsTo(models.IndikatorRenstra, {
        foreignKey: 'indikator_renstra_id',
        as: 'indikator',
      });
    }
  }

  RealisasiIndikatorRenstra.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      indikator_renstra_id: { type: DataTypes.INTEGER, allowNull: false },
      tahun: { type: DataTypes.STRING(4), allowNull: false },
      nilai_realisasi: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'RealisasiIndikatorRenstra',
      tableName: 'realisasi_indikator_renstra',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return RealisasiIndikatorRenstra;
};
