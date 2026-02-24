"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class program_arah_kebijakan extends Model {
  }

  program_arah_kebijakan.init(
    {},
    {
      sequelize,
      modelName: "program_arah_kebijakan",
      
      tableName: "program_arah_kebijakan",
      timestamps: false,
      underscored: true,
    
    }
  );

  return program_arah_kebijakan;
};
