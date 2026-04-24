"use strict";
const { Model } = require("sequelize");

/**
 * Model legacy Renstra OPD (struktur lama bertingkat).
 * Untuk dokumen Renstra refactor/canonical gunakan model `Renstra`
 * pada `renstraModel.js` (table `renstra`).
 */
module.exports = (sequelize, DataTypes) => {
  class RenstraOPD extends Model {
    static associate(models) {
      RenstraOPD.hasMany(models.RenstraTujuan, {
        foreignKey: "renstra_id",
        as: "tujuans",
      });

      RenstraOPD.hasMany(models.RenstraSasaran, {
        foreignKey: "renstra_id",
        as: "sasarans",
      });

      RenstraOPD.hasMany(models.RenstraSubkegiatan, {
        foreignKey: "renstra_opd_id",
        as: "subkegiatans",
      });

      RenstraOPD.belongsTo(models.OpdPenanggungJawab, {
        foreignKey: "opd_id",
        as: "opd",
      });

      RenstraOPD.hasMany(models.RenstraTabelTujuan, {
        foreignKey: "opd_id",
        as: "tabel_tujuan",
      });
    }
  }

  RenstraOPD.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      opd_id: DataTypes.INTEGER,
      rpjmd_id: DataTypes.INTEGER,
      bidang_opd: DataTypes.STRING,
      sub_bidang_opd: DataTypes.STRING,
      nama_opd: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tahun_mulai: DataTypes.INTEGER,
      tahun_akhir: DataTypes.INTEGER,
      keterangan: DataTypes.TEXT,
      is_aktif: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "RenstraOPD",
      tableName: "renstra_opd",
      underscored: true,
      timestamps: true,
    }
  );

  return RenstraOPD;
};
