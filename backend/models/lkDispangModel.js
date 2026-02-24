"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LkDispang extends Model {
    static associate(models) {
      LkDispang.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      LkDispang.belongsTo(models.Dpa, {
        foreignKey: "dpa_id",
        as: "dpa",
      });
    }
  }

  LkDispang.init(
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
      program: DataTypes.STRING,
      kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sub_kegiatan: DataTypes.STRING,
      akun_belanja: DataTypes.STRING,
      jenis_belanja: DataTypes.STRING,
      anggaran: DataTypes.DOUBLE,
      realisasi: DataTypes.DOUBLE,
      sisa: DataTypes.DOUBLE,
      persen_realisasi: DataTypes.DOUBLE,
      sumber_dana: DataTypes.STRING,
      jenis_dokumen: DataTypes.STRING,
      dpa_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "LkDispang",
      tableName: "lk_dispang",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LkDispang;
};
