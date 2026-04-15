"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanningLineItemChangeLog extends Model {}

  PlanningLineItemChangeLog.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      entity_type: { type: DataTypes.STRING(32), allowNull: false },
      entity_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      field_key: { type: DataTypes.STRING(64), allowNull: false },
      old_value: { type: DataTypes.TEXT, allowNull: true },
      new_value: { type: DataTypes.TEXT, allowNull: true },
      source: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "user" },
      change_batch_id: { type: DataTypes.STRING(40), allowNull: true },
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      change_type: { type: DataTypes.STRING(32), allowNull: true },
      version_before: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      version_after: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      entity_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      is_active_version: { type: DataTypes.BOOLEAN, allowNull: true },
    },
    {
      sequelize,
      modelName: "PlanningLineItemChangeLog",
      tableName: "planning_line_item_change_log",
      underscored: true,
      timestamps: false,
      updatedAt: false,
      createdAt: "created_at",
    },
  );

  return PlanningLineItemChangeLog;
};
