"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RpjmdSyncJob extends Model {
  }

  RpjmdSyncJob.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      job_code: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      rpjmd_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      target_module: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "RENSTRA",
      },
      scope: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: "all",
      },
      mode: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "draft",
      },
      requested_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      confirmed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      summary_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      finished_at: {
        type: DataTypes.DATE,
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
      modelName: "RpjmdSyncJob",
      tableName: "rpjmd_sync_jobs",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RpjmdSyncJob;
};
