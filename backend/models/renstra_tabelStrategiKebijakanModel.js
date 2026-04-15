"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraTabelStrategiKebijakan extends Model {
    static associate(models) {
      RenstraTabelStrategiKebijakan.belongsTo(models.RenstraStrategi, {
        foreignKey: "strategi_id",
        as: "strategi",
      });
      RenstraTabelStrategiKebijakan.belongsTo(models.RenstraKebijakan, {
        foreignKey: "kebijakan_id",
        as: "kebijakan",
      });
    }
  }

  RenstraTabelStrategiKebijakan.init(
    {
      renstra_id: DataTypes.INTEGER,
      strategi_id: DataTypes.INTEGER,
      kebijakan_id: DataTypes.INTEGER,
      kode_strategi: DataTypes.STRING(50),
      deskripsi_strategi: DataTypes.TEXT,
      kode_kebijakan: DataTypes.STRING(50),
      deskripsi_kebijakan: DataTypes.TEXT,
      indikator: DataTypes.STRING(255),
      baseline: DataTypes.FLOAT,
      satuan_target: DataTypes.STRING(100),
      lokasi: DataTypes.STRING(255),
      opd_penanggung_jawab: DataTypes.STRING(255),
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
      target_akhir_renstra: DataTypes.DECIMAL(10, 2),
      pagu_akhir_renstra: DataTypes.DECIMAL(20, 2),
    },
    {
      sequelize,
      modelName: "RenstraTabelStrategiKebijakan",
      tableName: "renstra_tabel_strategi_kebijakan",
      underscored: true,
      timestamps: true,
    }
  );

  return RenstraTabelStrategiKebijakan;
};
