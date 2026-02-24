"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ActivityLog extends Model {
  }

  ActivityLog.init(
    {},
    {
      sequelize,
      modelName: "ActivityLog",
      
    }
  );

  return ActivityLog;
};
