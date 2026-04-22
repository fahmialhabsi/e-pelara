"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UrusanKinerja20212024 extends Model {
    static associate(models) {
      UrusanKinerja20212024.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_rpjmd_id",
        as: "periodeRpjmd",
      });
    }
  }

  UrusanKinerja20212024.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periode_rpjmd_id: { type: DataTypes.INTEGER, allowNull: false },
      bidang_urusan: { type: DataTypes.STRING(8), allowNull: true },
      no_urut: { type: DataTypes.INTEGER, allowNull: false },
      indikator: { type: DataTypes.TEXT, allowNull: false },
      tahun_2021: { type: DataTypes.STRING(64), allowNull: true },
      tahun_2022: { type: DataTypes.STRING(64), allowNull: true },
      tahun_2023: { type: DataTypes.STRING(64), allowNull: true },
      tahun_2024: { type: DataTypes.STRING(64), allowNull: true },
      tahun_2025: { type: DataTypes.STRING(64), allowNull: true },
      satuan: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      sequelize,
      modelName: "UrusanKinerja20212024",
      tableName: "urusan_kinerja_2021_2024",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return UrusanKinerja20212024;
};
