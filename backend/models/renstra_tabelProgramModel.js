"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraTabelProgram extends Model {
    static associate(models) {
      RenstraTabelProgram.belongsTo(models.RenstraProgram, {
        foreignKey: "program_id",
        as: "program",
      });

      RenstraTabelProgram.belongsTo(models.IndikatorRenstra, {
        foreignKey: "indikator_id",
        as: "indikator",
      });
    }
  }

  RenstraTabelProgram.init(
    {
      program_id: DataTypes.INTEGER,
      indikator_id: DataTypes.INTEGER,
      baseline: DataTypes.FLOAT,
      satuan_target: DataTypes.STRING,
      target_tahun_1: DataTypes.FLOAT,
      target_tahun_2: DataTypes.FLOAT,
      target_tahun_3: DataTypes.FLOAT,
      target_tahun_4: DataTypes.FLOAT,
      target_tahun_5: DataTypes.FLOAT,
      target_tahun_6: DataTypes.FLOAT,
      pagu_tahun_1: DataTypes.DECIMAL(20, 2),
      pagu_tahun_2: DataTypes.DECIMAL(20, 2),
      pagu_tahun_3: DataTypes.DECIMAL(20, 2),
      pagu_tahun_4: DataTypes.DECIMAL(20, 2),
      pagu_tahun_5: DataTypes.DECIMAL(20, 2),
      pagu_tahun_6: DataTypes.DECIMAL(20, 2),
      lokasi: DataTypes.STRING,
      kode_program: DataTypes.STRING,
      nama_program: DataTypes.STRING,
      opd_penanggung_jawab: DataTypes.STRING,
      // 🔹 Tambahan baru
      pagu_akhir_renstra: DataTypes.DECIMAL(20, 2),
      target_akhir_renstra: DataTypes.DECIMAL(10, 0),
    },
    {
      sequelize,
      modelName: "RenstraTabelProgram",
      tableName: "renstra_tabel_program",
      underscored: true,
      timestamps: false,
    }
  );

  return RenstraTabelProgram;
};
