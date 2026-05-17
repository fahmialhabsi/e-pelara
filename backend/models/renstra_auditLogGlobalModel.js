// backend/models/renstra_auditLogGlobalModel.js
"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AuditLogGlobal extends Model {}

  AuditLogGlobal.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      module: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      action: {
        type: DataTypes.ENUM(
          "create",
          "update",
          "revisi",
          "verifikasi",
          "approve",
          "tolak",
          "delete",
          "rebuild"
        ),
        allowNull: false,
      },
      before_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      after_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RenstraAuditLogGlobal",
      tableName: "renstra_audit_log_global",
      timestamps: false,
      underscored: true,
    }
  );

  return AuditLogGlobal;
};