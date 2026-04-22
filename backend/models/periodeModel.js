"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PeriodeRpjmd extends Model {
    static associate(models) {
      PeriodeRpjmd.hasMany(models.User, {
        foreignKey: "periode_id",
        as: "users",
      });
      PeriodeRpjmd.hasMany(models.Kegiatan, {
        foreignKey: "periode_id",
        as: "kegiatans",
      });
      PeriodeRpjmd.hasMany(models.IndikatorSasaran, {
        foreignKey: "periode_id",
        as: "indikatorSasaran",
      });
      PeriodeRpjmd.hasMany(models.UrusanKinerja20212024, {
        foreignKey: "periode_rpjmd_id",
        as: "urusanKinerja20212024",
      });
      PeriodeRpjmd.hasMany(models.ApbdProyeksi20262030, {
        foreignKey: "periode_rpjmd_id",
        as: "apbdProyeksi20262030",
      });
      PeriodeRpjmd.hasMany(models.RpjmdTargetTujuanSasaran20252029, {
        foreignKey: "periode_rpjmd_id",
        as: "rpjmdTargetTujuanSasaran20252029",
      });
      PeriodeRpjmd.hasMany(models.ArahKebijakanRpjmdPdf, {
        foreignKey: "periode_rpjmd_id",
        as: "arahKebijakanRpjmdPdf",
      });
      PeriodeRpjmd.hasMany(models.IkuRpjmd, {
        foreignKey: "periode_rpjmd_id",
        as: "ikuRpjmd",
      });
    }
  }

  PeriodeRpjmd.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nama: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tahun_awal: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tahun_akhir: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "PeriodeRpjmd",
      tableName: "periode_rpjmds",
      underscored: true,
      timestamps: false,
    }
  );

  return PeriodeRpjmd;
};
