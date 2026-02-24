// models/realisasiBulanan.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RealisasiBulanan extends Model {
    static associate(models) {
      // Relasi ke Indikator
      RealisasiBulanan.belongsTo(models.Indikator, {
        foreignKey: "indikator_id",
        as: "indikator",
      });
    }
  }

  RealisasiBulanan.init(
    {
      indikator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "indikator", // nama tabel yang direferensikan
          key: "id",
        },
      },
      bulan: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tahun: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      realisasi: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "RealisasiBulanan",
      tableName: "realisasi_bulanan",
      underscored: true,
    }
  );

  return RealisasiBulanan;
};
