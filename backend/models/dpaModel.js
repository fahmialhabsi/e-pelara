"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Dpa extends Model {
    static associate(models) {
      Dpa.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      Dpa.belongsTo(models.Rka, {
        foreignKey: "rka_id",
        as: "rka",
      });
    }
  }

  Dpa.init(
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
      program: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sub_kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      indikator: DataTypes.STRING,
      target: DataTypes.STRING,
      anggaran: DataTypes.DOUBLE,
      jenis_dokumen: DataTypes.STRING,
      rka_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Dpa",
      tableName: "dpa",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Dpa;
};
