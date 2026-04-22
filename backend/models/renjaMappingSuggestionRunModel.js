"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaMappingSuggestionRun extends Model {
    static associate(models) {
      RenjaMappingSuggestionRun.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
      RenjaMappingSuggestionRun.hasMany(models.RenjaMappingSuggestionResult, {
        foreignKey: "renja_mapping_suggestion_run_id",
        as: "results",
      });
    }
  }

  RenjaMappingSuggestionRun.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      run_type: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "mapping" },
      summary_json: { type: DataTypes.JSON, allowNull: true },
      generated_by: { type: DataTypes.INTEGER, allowNull: true },
      generated_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "RenjaMappingSuggestionRun",
      tableName: "renja_mapping_suggestion_run",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RenjaMappingSuggestionRun;
};

