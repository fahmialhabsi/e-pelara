'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IkmPenilaian extends Model {
    static associate(models) {
      IkmPenilaian.belongsTo(models.RenstraOPD, {
        foreignKey: 'renstra_id',
        as: 'renstra',
      });
    }
  }

  IkmPenilaian.init(
    {
      renstra_id: { type: DataTypes.INTEGER, allowNull: false },
      tahun: { type: DataTypes.INTEGER, allowNull: false },
      periode: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'tahunan' },
      skor: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      sumber_survei: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      sequelize,
      modelName: 'IkmPenilaian',
      tableName: 'ikm_penilaian',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return IkmPenilaian;
};
