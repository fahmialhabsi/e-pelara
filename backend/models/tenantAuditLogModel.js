"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TenantAuditLog extends Model {
    static associate(models) {
      TenantAuditLog.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    }
  }

  TenantAuditLog.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      aksi: { type: DataTypes.STRING(80), allowNull: false },
      tenant_id_asal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      tenant_id_tujuan: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      payload: { type: DataTypes.JSON, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "TenantAuditLog",
      tableName: "tenant_audit_logs",
      underscored: true,
      timestamps: false,
    },
  );

  return TenantAuditLog;
};
