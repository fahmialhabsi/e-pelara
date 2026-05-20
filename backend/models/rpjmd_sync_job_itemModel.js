"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RpjmdSyncJobItem extends Model {
  }

  RpjmdSyncJobItem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      job_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      stage: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      source_table: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      source_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      source_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      source_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      target_table: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      target_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      target_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: "no_action",
      },
      classification: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      severity: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "info",
      },
      is_blocking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      before_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      after_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      diff_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "RpjmdSyncJobItem",
      tableName: "rpjmd_sync_job_items",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RpjmdSyncJobItem;
};
