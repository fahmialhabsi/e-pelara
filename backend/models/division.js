"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Division extends Model {
    static associate(models) {
      // Relasi jika ada, misalnya Division memiliki banyak Users
      Division.hasMany(models.User, {
        foreignKey: "divisions_id",
        as: "users",
      });
    }
  }

  Division.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      rpjmd_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Sesuaikan jika rpjmd_id wajib atau tidak
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
      modelName: "Division",

      tableName: "divisions",
      underscored: true,
      timestamps: true,
    }
  );

  return Division;
};
