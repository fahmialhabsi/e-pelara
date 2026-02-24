"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Monev extends Model {
    static associate(models) {
      Monev.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      Monev.belongsTo(models.Pengkeg, {
        foreignKey: "pengkeg_id",
        as: "pengkeg",
      });
    }
  }

  Monev.init(
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
      lokasi: DataTypes.STRING,
      capaian_kinerja: DataTypes.TEXT,
      kendala: DataTypes.TEXT,
      tindak_lanjut: DataTypes.TEXT,
      jenis_dokumen: DataTypes.STRING,
      pengkeg_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Monev",
      tableName: "monev",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Monev;
};
