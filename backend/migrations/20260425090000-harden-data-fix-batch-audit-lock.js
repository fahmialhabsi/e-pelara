"use strict";

/**
 * Hardening Data Fix: kolom batch lengkap, audit log, doc-level soft lock.
 * Idempotent (cek kolom / tabel).
 */

async function columnExists(queryInterface, table, column) {
  const d = await queryInterface.describeTable(table);
  return Boolean(d[column]);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));

    if (existing.has("renja_mapping_apply_batch")) {
      const add = async (col, def) => {
        if (!(await columnExists(queryInterface, "renja_mapping_apply_batch", col))) {
          await queryInterface.addColumn("renja_mapping_apply_batch", col, def);
        }
      };
      await add("change_type", {
        type: Sequelize.STRING(32),
        allowNull: true,
      });
      await add("items_before_json", { type: Sequelize.JSON, allowNull: true });
      await add("items_after_json", { type: Sequelize.JSON, allowNull: true });
      await add("apply_scope", {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "bulk",
      });
      await add("affected_fields_json", { type: Sequelize.JSON, allowNull: true });
      await add("rollback_status", {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "pending",
      });
      await add("version_before", { type: Sequelize.BIGINT, allowNull: true });
      await add("version_after", { type: Sequelize.BIGINT, allowNull: true });
    }

    if (!existing.has("renja_data_fix_audit_log")) {
      await queryInterface.createTable("renja_data_fix_audit_log", {
        id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        renja_dokumen_id: { type: Sequelize.INTEGER, allowNull: false },
        batch_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
        user_id: { type: Sequelize.INTEGER, allowNull: true },
        action_type: { type: Sequelize.STRING(48), allowNull: false },
        change_reason_text: { type: Sequelize.TEXT, allowNull: true },
        suggestion_type: { type: Sequelize.STRING(32), allowNull: true },
        before_snapshot_json: { type: Sequelize.JSON, allowNull: true },
        after_snapshot_json: { type: Sequelize.JSON, allowNull: true },
        meta_json: { type: Sequelize.JSON, allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
      await queryInterface.addIndex("renja_data_fix_audit_log", ["renja_dokumen_id", "created_at"], {
        name: "idx_renja_data_fix_audit_doc_created",
      });
      await queryInterface.addIndex("renja_data_fix_audit_log", ["renja_dokumen_id", "user_id"], {
        name: "idx_renja_data_fix_audit_doc_user",
      });
      await queryInterface.addIndex("renja_data_fix_audit_log", ["batch_id"], {
        name: "idx_renja_data_fix_audit_batch",
      });
    }

    if (!existing.has("renja_data_fix_doc_lock")) {
      await queryInterface.createTable("renja_data_fix_doc_lock", {
        renja_dokumen_id: { type: Sequelize.INTEGER, primaryKey: true },
        user_id: { type: Sequelize.INTEGER, allowNull: false },
        lock_expires_at: { type: Sequelize.DATE, allowNull: false },
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
    }

    if (existing.has("renja_mapping_apply_batch")) {
      await queryInterface.sequelize.query(`
        UPDATE renja_mapping_apply_batch
        SET rollback_status = 'rolled_back'
        WHERE rolled_back_at IS NOT NULL AND (rollback_status IS NULL OR rollback_status = 'pending')
      `);
      await queryInterface.sequelize.query(`
        UPDATE renja_mapping_apply_batch
        SET change_type = CASE suggestion_type
          WHEN 'mapping_program' THEN 'mapping_program'
          WHEN 'indicator_mapping' THEN 'indikator'
          WHEN 'target_autofill' THEN 'target'
          WHEN 'policy_conflict' THEN 'policy'
          ELSE 'mapping_program' END
        WHERE change_type IS NULL
      `);
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("renja_data_fix_doc_lock")) {
      await queryInterface.dropTable("renja_data_fix_doc_lock");
    }
    if (existing.has("renja_data_fix_audit_log")) {
      await queryInterface.dropTable("renja_data_fix_audit_log");
    }
    if (existing.has("renja_mapping_apply_batch")) {
      for (const col of [
        "change_type",
        "items_before_json",
        "items_after_json",
        "apply_scope",
        "affected_fields_json",
        "rollback_status",
        "version_before",
        "version_after",
      ]) {
        if (await columnExists(queryInterface, "renja_mapping_apply_batch", col)) {
          await queryInterface.removeColumn("renja_mapping_apply_batch", col);
        }
      }
    }
  },
};
