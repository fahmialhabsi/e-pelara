"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaMismatchResult extends Model {
    static associate(models) {
      RenjaMismatchResult.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
      RenjaMismatchResult.belongsTo(models.RenjaItem, {
        foreignKey: "renja_item_id",
        as: "renjaItem",
      });
      RenjaMismatchResult.belongsTo(models.RenjaValidationRun, {
        foreignKey: "renja_validation_run_id",
        as: "validationRun",
      });
    }
  }

  RenjaMismatchResult.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_validation_run_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      renja_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      renja_item_id: { type: DataTypes.INTEGER, allowNull: true },
      mismatch_scope: { type: DataTypes.STRING(16), allowNull: false },
      source_type: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "INTERNAL" },
      mismatch_code: { type: DataTypes.STRING(64), allowNull: false },
      mismatch_label: { type: DataTypes.STRING(255), allowNull: true },
      severity: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "warning" },
      message: { type: DataTypes.TEXT, allowNull: false },
      recommendation: { type: DataTypes.TEXT, allowNull: true },
      field_name: { type: DataTypes.STRING(64), allowNull: true },
      source_reference_type: { type: DataTypes.STRING(32), allowNull: true },
      source_reference_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      expected_value: { type: DataTypes.TEXT, allowNull: true },
      actual_value: { type: DataTypes.TEXT, allowNull: true },
      is_blocking: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_resolved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      resolved_by: { type: DataTypes.INTEGER, allowNull: true },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      computed_at: { type: DataTypes.DATE, allowNull: false },
      suggested_route: { type: DataTypes.STRING(512), allowNull: true },
      suggested_anchor: { type: DataTypes.STRING(128), allowNull: true },
      section_key: { type: DataTypes.STRING(64), allowNull: true },
      row_key: { type: DataTypes.STRING(128), allowNull: true },
      editor_target: { type: DataTypes.STRING(64), allowNull: true },
      hierarchy_trace: { type: DataTypes.JSON, allowNull: true },
      expected_source_trace: { type: DataTypes.JSON, allowNull: true },
      threshold_context: { type: DataTypes.JSON, allowNull: true },
      hierarchy_level: { type: DataTypes.STRING(32), allowNull: true },
      document_pair: { type: DataTypes.STRING(32), allowNull: true },
    },
    {
      sequelize,
      modelName: "RenjaMismatchResult",
      tableName: "renja_mismatch_result",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RenjaMismatchResult;
};
