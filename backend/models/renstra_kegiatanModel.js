"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraKegiatan extends Model {
    static associate(models) {
      RenstraKegiatan.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_id",
        targetKey: "id",
        as: "renstra",
      });

      RenstraKegiatan.belongsTo(models.Kegiatan, {
        foreignKey: "rpjmd_kegiatan_id",
        targetKey: "id",
        as: "kegiatan_rpjmd",
      });
      RenstraKegiatan.belongsTo(models.RenstraProgram, {
        foreignKey: "program_id",
        targetKey: "id",
        as: "program_renstra",
      });

      RenstraKegiatan.hasMany(models.RenstraSubkegiatan, {
        foreignKey: "kegiatan_id",
        as: "subKegiatans",
      });

      RenstraKegiatan.hasMany(models.IndikatorRenstra, {
        foreignKey: "ref_id",
        constraints: false,
        scope: { stage: "kegiatan" },
        as: "indikators",
      });

      RenstraKegiatan.hasMany(models.RenstraTabelSubkegiatan, {
        foreignKey: "kegiatan_id",
        as: "tabelSubKegiatans", // alias sesuai yang dipakai di controller
      });
    }
  }

  RenstraKegiatan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      renstra_id: DataTypes.INTEGER,
      program_id: DataTypes.INTEGER,
      kode_kegiatan: DataTypes.STRING,
      nama_kegiatan: DataTypes.STRING,
      bidang_opd: DataTypes.STRING,
      rpjmd_kegiatan_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "RenstraKegiatan",
      tableName: "renstra_kegiatan",
      underscored: true,
      timestamps: false,
    }
  );

  return RenstraKegiatan;
};
