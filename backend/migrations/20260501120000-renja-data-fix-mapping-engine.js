"use strict";

async function tableExists(queryInterface, tableName) {
  const rows = await queryInterface.showAllTables();
  const names = (rows || []).map((r) =>
    String(typeof r === "string" ? r : Array.isArray(r) ? r[0] : Object.values(r)[0]),
  );
  return names.some((x) => x.toLowerCase() === tableName.toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    if (!(await tableExists(queryInterface, "renja_mapping_suggestion_run"))) {
      await queryInterface.createTable("renja_mapping_suggestion_run", {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        renja_dokumen_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "renja_dokumen", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        run_type: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "mapping" },
        summary_json: { type: DataTypes.JSON, allowNull: true },
        generated_by: { type: DataTypes.INTEGER, allowNull: true },
        generated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("renja_mapping_suggestion_run", ["renja_dokumen_id", "run_type", "generated_at"], {
        name: "idx_renja_mapping_suggestion_run_doc_type_time",
      });
    }

    if (!(await tableExists(queryInterface, "renja_mapping_suggestion_result"))) {
      await queryInterface.createTable("renja_mapping_suggestion_result", {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        renja_mapping_suggestion_run_id: {
          type: DataTypes.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: "renja_mapping_suggestion_run", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        renja_dokumen_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "renja_dokumen", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        renja_item_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "renja_item", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
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
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("renja_mapping_suggestion_result", ["renja_dokumen_id", "suggestion_type"], {
        name: "idx_renja_mapping_suggestion_doc_type",
      });
      await queryInterface.addIndex("renja_mapping_suggestion_result", ["renja_item_id", "suggestion_type"], {
        name: "idx_renja_mapping_suggestion_item_type",
      });
      await queryInterface.addIndex(
        "renja_mapping_suggestion_result",
        ["renja_dokumen_id", "suggestion_confidence", "is_conflict", "is_accepted"],
        { name: "idx_renja_mapping_suggestion_apply" },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("renja_mapping_suggestion_result").catch(() => {});
    await queryInterface.dropTable("renja_mapping_suggestion_run").catch(() => {});
  },
};

