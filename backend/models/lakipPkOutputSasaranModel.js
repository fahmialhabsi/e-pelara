'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LakipPkOutputSasaran extends Model {
    static associate(models) {
      LakipPkOutputSasaran.belongsTo(models.LakipPk, {
        foreignKey: 'lakip_pk_id',
        as: 'lakip_pk',
      });
      LakipPkOutputSasaran.belongsTo(models.IndikatorRenstra, {
        foreignKey: 'indikator_renstra_id',
        as: 'indikator',
      });
    }
  }

  LakipPkOutputSasaran.init(
    {
      lakip_pk_id: { type: DataTypes.INTEGER, allowNull: false },
      indikator_renstra_id: { type: DataTypes.INTEGER, allowNull: false },
      output: { type: DataTypes.TEXT, allowNull: true },
      bukti_ukur: { type: DataTypes.TEXT, allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: 'LakipPkOutputSasaran',
      tableName: 'lakip_pk_output_sasaran',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return LakipPkOutputSasaran;
};
