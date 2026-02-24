"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
  }

  Notification.init(
    {},
    {
      sequelize,
      modelName: "Notification",
      
    }
  );

  return Notification;
};
