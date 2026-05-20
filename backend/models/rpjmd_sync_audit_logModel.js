"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RpjmdSyncAuditLog extends Model {
  }

  RpjmdSyncAuditLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      job_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      actor_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      actor_role: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      event_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      target_module: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "RENSTRA",
      },
      rpjmd_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      payload_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      result_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "RpjmdSyncAuditLog",
      tableName: "rpjmd_sync_audit_logs",
      underscored: true,
      timestamps: false,
      createdAt: false,
      updatedAt: false,
    },
  );

  return RpjmdSyncAuditLog;
};
