"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ProgramArahKebijakan extends Model {
    static associate(models) {
      // Tidak wajib jika tidak perlu relasi ke model lain
    }
  }

  ProgramArahKebijakan.init(
    {
      program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      arah_kebijakan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      strategi_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ProgramArahKebijakan",
      tableName: "program_arah_kebijakan",
      timestamps: false,
      underscored: true,
    }
  );

  return ProgramArahKebijakan;
};
