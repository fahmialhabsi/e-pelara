"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ApbdProyeksi20262030 extends Model {
    static associate(models) {
      ApbdProyeksi20262030.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_rpjmd_id",
        as: "periodeRpjmd",
      });
    }
  }

  ApbdProyeksi20262030.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periode_rpjmd_id: { type: DataTypes.INTEGER, allowNull: false },
      kode_baris: { type: DataTypes.STRING(32), allowNull: true },
      uraian: { type: DataTypes.TEXT, allowNull: false },
      target_2025: { type: DataTypes.STRING(64), allowNull: true },
      proyeksi_2026: { type: DataTypes.STRING(64), allowNull: true },
      proyeksi_2027: { type: DataTypes.STRING(64), allowNull: true },
      proyeksi_2028: { type: DataTypes.STRING(64), allowNull: true },
      proyeksi_2029: { type: DataTypes.STRING(64), allowNull: true },
      proyeksi_2030: { type: DataTypes.STRING(64), allowNull: true },
    },
    {
      sequelize,
      modelName: "ApbdProyeksi20262030",
      tableName: "apbd_proyeksi_2026_2030",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return ApbdProyeksi20262030;
};
