"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaMappingApplyBatch extends Model {
    static associate(models) {
      RenjaMappingApplyBatch.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
    }
  }

  RenjaMappingApplyBatch.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      suggestion_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "mapping_program",
      },
      items_json: { type: DataTypes.JSON, allowNull: false },
      change_reason_text: { type: DataTypes.TEXT, allowNull: true },
      applied_by: { type: DataTypes.INTEGER, allowNull: true },
      applied_at: { type: DataTypes.DATE, allowNull: false },
      rolled_back_at: { type: DataTypes.DATE, allowNull: true },
      rolled_back_by: { type: DataTypes.INTEGER, allowNull: true },
      rollback_reason_text: { type: DataTypes.TEXT, allowNull: true },
      change_type: { type: DataTypes.STRING(32), allowNull: true },
      items_before_json: { type: DataTypes.JSON, allowNull: true },
      items_after_json: { type: DataTypes.JSON, allowNull: true },
      apply_scope: { type: DataTypes.STRING(16), allowNull: true, defaultValue: "bulk" },
      affected_fields_json: { type: DataTypes.JSON, allowNull: true },
      rollback_status: { type: DataTypes.STRING(16), allowNull: true, defaultValue: "pending" },
      version_before: { type: DataTypes.BIGINT, allowNull: true },
      version_after: { type: DataTypes.BIGINT, allowNull: true },
    },
    {
      sequelize,
      modelName: "RenjaMappingApplyBatch",
      tableName: "renja_mapping_apply_batch",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RenjaMappingApplyBatch;
};
