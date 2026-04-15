"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ComplianceSnapshotHistory extends Model {
    static associate(models) {
      ComplianceSnapshotHistory.belongsTo(models.User, {
        foreignKey: "recorded_by",
        as: "recordedByUser",
      });
    }
  }

  ComplianceSnapshotHistory.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      captured_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      snapshot: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      recorded_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: "ComplianceSnapshotHistory",
      tableName: "compliance_snapshot_history",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return ComplianceSnapshotHistory;
};
