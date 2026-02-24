"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraBab extends Model {
  }

  RenstraBab.init(
    {
      tahun: DataTypes.INTEGER,
      bab: DataTypes.STRING,
      judul_bab: DataTypes.STRING,
      subbab: DataTypes.STRING,
      isi: DataTypes.JSON,
      updated_by: DataTypes.STRING,
      updated_at: DataTypes.DATE,
      created_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "RenstraBab",
      
      tableName: "renstra_bab",
      timestamps: false,
    
    }
  );

  return RenstraBab;
};
