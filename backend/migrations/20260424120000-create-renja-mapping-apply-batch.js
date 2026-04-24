"use strict";

/**
 * Batch snapshot untuk apply mapping RENJA (undo/rollback + audit).
 * Idempotent: skip jika tabel sudah ada.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("renja_mapping_apply_batch")) return;

    await queryInterface.createTable("renja_mapping_apply_batch", {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_dokumen_id: { type: Sequelize.INTEGER, allowNull: false },
      suggestion_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "mapping_program",
      },
      items_json: { type: Sequelize.JSON, allowNull: false },
      change_reason_text: { type: Sequelize.TEXT, allowNull: true },
      applied_by: { type: Sequelize.INTEGER, allowNull: true },
      applied_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      rolled_back_at: { type: Sequelize.DATE, allowNull: true },
      rolled_back_by: { type: Sequelize.INTEGER, allowNull: true },
      rollback_reason_text: { type: Sequelize.TEXT, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("renja_mapping_apply_batch", ["renja_dokumen_id", "applied_at"], {
      name: "idx_renja_map_apply_batch_doc_applied",
    });
    await queryInterface.addIndex("renja_mapping_apply_batch", ["renja_dokumen_id", "rolled_back_at"], {
      name: "idx_renja_map_apply_batch_doc_rollback",
    });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (!existing.has("renja_mapping_apply_batch")) return;
    await queryInterface.dropTable("renja_mapping_apply_batch");
  },
};
