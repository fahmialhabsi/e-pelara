"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraTujuan extends Model {
    static associate(models) {
      RenstraTujuan.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_id",
        targetKey: "id",
        as: "renstra",
      });

      RenstraTujuan.hasMany(models.RenstraSasaran, {
        foreignKey: "tujuan_id",
        as: "sasarans",
      });

      RenstraTujuan.belongsTo(models.Tujuan, {
        foreignKey: "rpjmd_tujuan_id",
        targetKey: "id",
        as: "tujuan_rpjmd",
      });
      RenstraTujuan.hasMany(models.IndikatorRenstra, {
        foreignKey: "ref_id",
        constraints: false,
        scope: { stage: "tujuan" },
        as: "indikators",
      });
    }
  }

  RenstraTujuan.init(
    {
      misi_id: DataTypes.INTEGER,
      renstra_id: DataTypes.INTEGER,
      rpjmd_tujuan_id: DataTypes.UUID,
      no_tujuan: DataTypes.STRING,
      isi_tujuan: DataTypes.TEXT,
      no_rpjmd: DataTypes.STRING,
      isi_tujuan_rpjmd: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "RenstraTujuan",
      tableName: "renstra_tujuan",
      underscored: true,
      timestamps: false,
    }
  );

  return RenstraTujuan;
};
