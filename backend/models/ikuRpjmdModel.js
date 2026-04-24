"use strict";
const { Model } = require("sequelize");

/** IKU dari dokumen RPJMD (Tabel 4.2), terpisah dari modul kinerja lain. */
module.exports = (sequelize, DataTypes) => {
  class IkuRpjmd extends Model {
    static associate(models) {
      IkuRpjmd.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_rpjmd_id",
        as: "periodeRpjmd",
      });
    }
  }

  IkuRpjmd.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periode_rpjmd_id: { type: DataTypes.INTEGER, allowNull: false },
      no_urut: { type: DataTypes.INTEGER, allowNull: false },
      indikator: { type: DataTypes.TEXT, allowNull: false },
      baseline_2024: { type: DataTypes.STRING(128), allowNull: true },
      target_2025: { type: DataTypes.STRING(128), allowNull: true },
      target_2026: { type: DataTypes.STRING(128), allowNull: true },
      target_2027: { type: DataTypes.STRING(128), allowNull: true },
      target_2028: { type: DataTypes.STRING(128), allowNull: true },
      target_2029: { type: DataTypes.STRING(128), allowNull: true },
      target_2030: { type: DataTypes.STRING(128), allowNull: true },
    },
    {
      sequelize,
      modelName: "IkuRpjmd",
      tableName: "iku_rpjmd",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return IkuRpjmd;
};
