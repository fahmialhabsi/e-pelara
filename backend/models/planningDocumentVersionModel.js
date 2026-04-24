"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanningDocumentVersion extends Model {}

  PlanningDocumentVersion.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      document_type: { type: DataTypes.STRING(48), allowNull: false },
      document_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      version_number: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      previous_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      action: { type: DataTypes.STRING(40), allowNull: false },
      actor_id: { type: DataTypes.INTEGER, allowNull: true },
      reason_text: { type: DataTypes.TEXT, allowNull: true },
      reason_file: { type: DataTypes.STRING(255), allowNull: true },
      snapshot: { type: DataTypes.JSON, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "PlanningDocumentVersion",
      tableName: "planning_document_versions",
      underscored: true,
      timestamps: false,
    },
  );

  return PlanningDocumentVersion;
};
