'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LakipPkProgramAnggaran extends Model {
    static associate(models) {
      LakipPkProgramAnggaran.belongsTo(models.LakipPk, {
        foreignKey: 'lakip_pk_id',
        as: 'lakip_pk',
      });
    }
  }

  LakipPkProgramAnggaran.init(
    {
      lakip_pk_id: { type: DataTypes.INTEGER, allowNull: false },
      nama_program: { type: DataTypes.TEXT, allowNull: false },
      jumlah_anggaran: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: 'LakipPkProgramAnggaran',
      tableName: 'lakip_pk_program_anggaran',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return LakipPkProgramAnggaran;
};
