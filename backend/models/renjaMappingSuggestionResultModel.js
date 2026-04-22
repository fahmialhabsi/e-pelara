"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaMappingSuggestionResult extends Model {
    static associate(models) {
      RenjaMappingSuggestionResult.belongsTo(models.RenjaMappingSuggestionRun, {
        foreignKey: "renja_mapping_suggestion_run_id",
        as: "run",
      });
      RenjaMappingSuggestionResult.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
      RenjaMappingSuggestionResult.belongsTo(models.RenjaItem, {
        foreignKey: "renja_item_id",
        as: "renjaItem",
      });
    }
  }

  RenjaMappingSuggestionResult.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_mapping_suggestion_run_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      renja_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      renja_item_id: { type: DataTypes.INTEGER, allowNull: true },
      suggestion_type: { type: DataTypes.STRING(32), allowNull: false },
      suggested_entity_type: { type: DataTypes.STRING(64), allowNull: true },
      suggested_entity_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      suggested_program_id: { type: DataTypes.INTEGER, allowNull: true },
      suggested_source_renstra_program_id: { type: DataTypes.INTEGER, allowNull: true },
      suggested_source_renstra_kegiatan_id: { type: DataTypes.INTEGER, allowNull: true },
      suggested_source_renstra_subkegiatan_id: { type: DataTypes.INTEGER, allowNull: true },
      suggested_source_indikator_renstra_id: { type: DataTypes.INTEGER, allowNull: true },
      suggested_target_numerik: { type: DataTypes.DECIMAL(20, 4), allowNull: true },
      suggested_target_teks: { type: DataTypes.STRING(255), allowNull: true },
      suggested_satuan: { type: DataTypes.STRING(64), allowNull: true },
      suggested_target_source: { type: DataTypes.STRING(32), allowNull: true },
      suggested_match_type: { type: DataTypes.STRING(32), allowNull: true },
      suggestion_score: { type: DataTypes.DECIMAL(8, 4), allowNull: true },
      suggestion_confidence: { type: DataTypes.STRING(16), allowNull: true },
      suggestion_reason: { type: DataTypes.TEXT, allowNull: true },
      source_context_json: { type: DataTypes.JSON, allowNull: true },
      suggestion_payload_json: { type: DataTypes.JSON, allowNull: true },
      suggested_policy_chain_trace: { type: DataTypes.JSON, allowNull: true },
      is_conflict: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      conflict_reason: { type: DataTypes.TEXT, allowNull: true },
      resolution_mode: { type: DataTypes.STRING(32), allowNull: true },
      is_auto_applied: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_accepted: { type: DataTypes.BOOLEAN, allowNull: true },
      accepted_by: { type: DataTypes.INTEGER, allowNull: true },
      accepted_at: { type: DataTypes.DATE, allowNull: true },
      rejected_by: { type: DataTypes.INTEGER, allowNull: true },
      rejected_at: { type: DataTypes.DATE, allowNull: true },
      applied_by: { type: DataTypes.INTEGER, allowNull: true },
      applied_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "RenjaMappingSuggestionResult",
      tableName: "renja_mapping_suggestion_result",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RenjaMappingSuggestionResult;
};

