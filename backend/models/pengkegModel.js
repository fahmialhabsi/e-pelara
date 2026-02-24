"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Pengkeg extends Model {
    static associate(models) {
      Pengkeg.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      Pengkeg.belongsTo(models.Dpa, {
        foreignKey: "dpa_id",
        as: "dpa",
      });
    }
  }

  Pengkeg.init(
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
      nama_kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      realisasi_fisik: DataTypes.DOUBLE,
      realisasi_keuangan: DataTypes.DOUBLE,
      keterangan: DataTypes.TEXT,
      jenis_dokumen: DataTypes.STRING,
      dpa_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Pengkeg",
      tableName: "pengkeg",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Pengkeg;
};
