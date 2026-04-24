"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RpjmdTargetTujuanSasaran20252029 extends Model {
    static associate(models) {
      RpjmdTargetTujuanSasaran20252029.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_rpjmd_id",
        as: "periodeRpjmd",
      });
    }
  }

  RpjmdTargetTujuanSasaran20252029.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periode_rpjmd_id: { type: DataTypes.INTEGER, allowNull: false },
      urutan: { type: DataTypes.INTEGER, allowNull: false },
      tujuan: { type: DataTypes.TEXT, allowNull: true },
      sasaran: { type: DataTypes.TEXT, allowNull: true },
      indikator: { type: DataTypes.TEXT, allowNull: false },
      baseline_2024: { type: DataTypes.STRING(128), allowNull: true },
      target_2025: { type: DataTypes.STRING(128), allowNull: true },
      target_2026: { type: DataTypes.STRING(128), allowNull: true },
      target_2027: { type: DataTypes.STRING(128), allowNull: true },
      target_2028: { type: DataTypes.STRING(128), allowNull: true },
      target_2029: { type: DataTypes.STRING(128), allowNull: true },
      target_2030: { type: DataTypes.STRING(128), allowNull: true },
      ket: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "RpjmdTargetTujuanSasaran20252029",
      tableName: "rpjmd_target_tujuan_sasaran_2025_2029",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return RpjmdTargetTujuanSasaran20252029;
};
