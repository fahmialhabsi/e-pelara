"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrioritasNasional extends Model {
    static associate(models) {
      PrioritasNasional.hasMany(models.Rkpd, {
        foreignKey: "prioritas_nasional_id",
        as: "rkpd",
      });
    }
  }

  PrioritasNasional.init(
    {
      kode_prionas: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nama_prionas: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      uraian_prionas: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      sumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      jenis_dokumen: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      tahun: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "PrioritasNasional",
      tableName: "prioritas_nasional",
      timestamps: false,
      indexes: [
        {
          name: "unique_prionas_combination",
          unique: true,
          fields: [
            "kode_prionas",
            "uraian_prionas",
            "jenis_dokumen",
            "tahun",
            "periode_id",
          ],
        },
      ],
    }
  );

  return PrioritasNasional;
};
