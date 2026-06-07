'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RenstraTabelProgram extends Model {
    static associate(models) {
      RenstraTabelProgram.belongsTo(models.RenstraOPD, {
        foreignKey: 'renstra_id',
        as: 'renstra',
      });

      RenstraTabelProgram.belongsTo(models.RenstraProgram, {
        foreignKey: 'program_id',
        as: 'program',
      });

      RenstraTabelProgram.belongsTo(models.IndikatorRenstra, {
        foreignKey: 'indikator_id',
        as: 'indikator_detail',
      });
    }
  }

  RenstraTabelProgram.init(
    {
      renstra_id: DataTypes.INTEGER,
      program_id: DataTypes.INTEGER,
      kebijakan_id: DataTypes.INTEGER,
      indikator_id: DataTypes.INTEGER,

      baseline: DataTypes.DECIMAL(15, 2),
      satuan_target: DataTypes.STRING(100),

      target_tahun_1: DataTypes.DECIMAL(15, 2),
      target_tahun_2: DataTypes.DECIMAL(15, 2),
      target_tahun_3: DataTypes.DECIMAL(15, 2),
      target_tahun_4: DataTypes.DECIMAL(15, 2),
      target_tahun_5: DataTypes.DECIMAL(15, 2),
      target_tahun_6: DataTypes.DECIMAL(15, 2),

      pagu_tahun_1: DataTypes.DECIMAL(20, 2),
      pagu_tahun_2: DataTypes.DECIMAL(20, 2),
      pagu_tahun_3: DataTypes.DECIMAL(20, 2),
      pagu_tahun_4: DataTypes.DECIMAL(20, 2),
      pagu_tahun_5: DataTypes.DECIMAL(20, 2),
      pagu_tahun_6: DataTypes.DECIMAL(20, 2),

      lokasi: DataTypes.STRING(255),

      target_akhir_renstra: DataTypes.DECIMAL(15, 2),
      pagu_akhir_renstra: DataTypes.DECIMAL(20, 2),
      pagu_rpjmd_acuan: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0.0,
      },

      versi: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      status_revisi: {
        type: DataTypes.STRING(20),
        defaultValue: 'draft',
      },

      last_revised_at: DataTypes.DATE,
      last_revised_by: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'RenstraTabelProgram',
      tableName: 'renstra_tabel_program',
      underscored: true,
      timestamps: false,
    },
  );

  return RenstraTabelProgram;
};
