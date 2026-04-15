"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanningAuditEvent extends Model {}

  PlanningAuditEvent.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      module_name: { type: DataTypes.STRING(80), allowNull: false },
      table_name: { type: DataTypes.STRING(80), allowNull: false },
      record_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      action_type: { type: DataTypes.STRING(32), allowNull: false },
      old_value: { type: DataTypes.JSON, allowNull: true },
      new_value: { type: DataTypes.JSON, allowNull: true },
      change_reason_text: { type: DataTypes.TEXT, allowNull: true },
      change_reason_file: { type: DataTypes.STRING(255), allowNull: true },
      changed_by: { type: DataTypes.INTEGER, allowNull: true },
      changed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      version_before: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      version_after: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      snapshot: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "{ before, after, changed_fields, summary }",
      },
    },
    {
      sequelize,
      modelName: "PlanningAuditEvent",
      tableName: "planning_audit_events",
      underscored: true,
      timestamps: false,
    }
  );

  return PlanningAuditEvent;
};
