"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Renja extends Model {
    static associate(models) {
      Renja.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      Renja.belongsTo(models.Rkpd, {
        foreignKey: "rkpd_id",
        as: "rkpd",
      });
    }
  }

  Renja.init(
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
      rkpd_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Renja",
      tableName: "renja",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Renja;
};
