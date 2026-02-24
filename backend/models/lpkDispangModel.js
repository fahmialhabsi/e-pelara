"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LpkDispang extends Model {
    static associate(models) {
      LpkDispang.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      LpkDispang.belongsTo(models.Monev, {
        foreignKey: "monev_id",
        as: "monev",
      });
    }
  }

  LpkDispang.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      pelaksana: DataTypes.STRING,
      capaian: DataTypes.TEXT,
      kendala: DataTypes.TEXT,
      rekomendasi: DataTypes.TEXT,
      jenis_dokumen: DataTypes.STRING,
      monev_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "LpkDispang",
      tableName: "lpk_dispang",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LpkDispang;
};
