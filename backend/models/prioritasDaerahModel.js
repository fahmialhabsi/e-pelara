"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrioritasDaerah extends Model {
    static associate(models) {
      PrioritasDaerah.hasMany(models.Rkpd, {
        foreignKey: "prioritas_daerah_id",
        as: "rkpd",
      });
    }
  }

  PrioritasDaerah.init(
    {
      kode_prioda: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      uraian_prioda: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      nama_prioda: {
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
      opd_tujuan: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "PrioritasDaerah",
      tableName: "prioritas_daerah",
      timestamps: false,
      indexes: [
        {
          name: "unique_prioda_combination",
          unique: true,
          fields: [
            "kode_prioda",
            "uraian_prioda",
            "jenis_dokumen",
            "tahun",
            "periode_id",
          ],
        },
      ],
    }
  );

  return PrioritasDaerah;
};
