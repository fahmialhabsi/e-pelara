"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaDataFixAuditLog extends Model {
    static associate(models) {
      RenjaDataFixAuditLog.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
    }
  }

  RenjaDataFixAuditLog.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      action_type: { type: DataTypes.STRING(48), allowNull: false },
      change_reason_text: { type: DataTypes.TEXT, allowNull: true },
      suggestion_type: { type: DataTypes.STRING(32), allowNull: true },
      before_snapshot_json: { type: DataTypes.JSON, allowNull: true },
      after_snapshot_json: { type: DataTypes.JSON, allowNull: true },
      meta_json: { type: DataTypes.JSON, allowNull: true },
    },
    {
      sequelize,
      modelName: "RenjaDataFixAuditLog",
      tableName: "renja_data_fix_audit_log",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  return RenjaDataFixAuditLog;
};
