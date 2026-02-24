"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraSasaran extends Model {
    static associate(models) {
      RenstraSasaran.belongsTo(models.RenstraTujuan, {
        foreignKey: "tujuan_id",
        targetKey: "id",
        as: "tujuan",
      });

      RenstraSasaran.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_id",
        targetKey: "id",
        as: "renstra",
      });

      RenstraSasaran.belongsTo(models.Sasaran, {
        foreignKey: "rpjmd_sasaran_id",
        targetKey: "id",
        as: "sasaran_rpjmd",
      });

      RenstraSasaran.hasMany(models.IndikatorRenstra, {
        foreignKey: "ref_id",
        constraints: false,
        scope: { stage: "sasaran" },
        as: "indikators",
      });
    }
  }

  RenstraSasaran.init(
    {
      renstra_id: DataTypes.INTEGER,
      rpjmd_sasaran_id: DataTypes.INTEGER,
      nomor: DataTypes.STRING,
      isi_sasaran: DataTypes.TEXT,
      no_rpjmd: DataTypes.STRING,
      isi_sasaran_rpjmd: DataTypes.TEXT,
      tujuan_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "RenstraSasaran",
      tableName: "renstra_sasaran",
      underscored: true,
      freezeTableName: true,
      timestamps: false,
    }
  );

  return RenstraSasaran;
};
