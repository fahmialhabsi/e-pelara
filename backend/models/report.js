"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Report extends Model {
  }

  Report.init(
    {
      periode: { type: DataTypes.STRING, allowNull: false },
      jenis: { type: DataTypes.STRING, allowNull: false },
      file_path: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      modelName: "Report",
       tableName: "report", underscored: true 
    }
  );

  return Report;
};
