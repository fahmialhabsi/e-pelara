"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ActivityLog extends Model {}

  ActivityLog.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entity_type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      old_data: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      new_data: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ActivityLog",
      tableName: "activity_logs",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  return ActivityLog;
};
