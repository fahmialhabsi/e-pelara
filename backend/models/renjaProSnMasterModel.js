'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RenjaProSnMaster extends Model {
    static associate(models) {
      RenjaProSnMaster.hasMany(models.RenjaDukunganProsnTematik, {
        foreignKey: 'pro_sn_master_id',
        as: 'dukungan',
      });
    }
  }

  RenjaProSnMaster.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pro_sn: { type: DataTypes.STRING(150), allowNull: false },
      proyek_kegiatan: { type: DataTypes.STRING(255), allowNull: false },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: 'RenjaProSnMaster',
      tableName: 'renja_pro_sn_master',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return RenjaProSnMaster;
};
