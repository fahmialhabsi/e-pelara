"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Rka extends Model {
    static associate(models) {
      Rka.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      Rka.belongsTo(models.Renja, {
        foreignKey: "renja_id",
        as: "renja",
      });
    }
  }

  Rka.init(
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
      renja_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Rka",
      tableName: "rka",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Rka;
};
