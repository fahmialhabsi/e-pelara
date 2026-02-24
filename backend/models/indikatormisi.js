"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IndikatorMisi extends Model {
    static associate(models) {
      this.hasMany(models.IndikatorTujuan, {
        foreignKey: "misi_id",
        as: "IndikatorTujuans",
      });
    }
  }

  IndikatorMisi.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      no_misi: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      isi_misi: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      jenis_dokumen: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "IndikatorMisi",
      tableName: "indikatormisis",
      timestamps: true,
    }
  );

  return IndikatorMisi;
};
