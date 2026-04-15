"use strict";

/**
 * Production-grade temporal layer (additive).
 * Tidak menghapus planning_line_item_change_log; memperkaya + tabel versi + cascade trace.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { BIGINT, INTEGER, STRING, TEXT, DATE, BOOLEAN, DECIMAL, JSON } = Sequelize;

    // --- Dokumen versions ---
    await queryInterface.createTable("rkpd_dokumen_version", {
      id: { type: BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      rkpd_dokumen_id: { type: INTEGER, allowNull: false },
      version_number: { type: INTEGER, allowNull: false },
      snapshot_data: { type: JSON, allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      created_by: { type: INTEGER, allowNull: true },
      is_current: { type: BOOLEAN, allowNull: false, defaultValue: false },
    });
    await queryInterface.addIndex("rkpd_dokumen_version", ["rkpd_dokumen_id", "version_number"], {
      unique: true,
      name: "rkpd_doc_ver_unique",
    });
    await queryInterface.addIndex("rkpd_dokumen_version", ["rkpd_dokumen_id", "is_current"], {
      name: "rkpd_doc_ver_current_idx",
    });

    await queryInterface.createTable("renja_dokumen_version", {
      id: { type: BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_dokumen_id: { type: INTEGER, allowNull: false },
      version_number: { type: INTEGER, allowNull: false },
      snapshot_data: { type: JSON, allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      created_by: { type: INTEGER, allowNull: true },
      is_current: { type: BOOLEAN, allowNull: false, defaultValue: false },
    });
    await queryInterface.addIndex("renja_dokumen_version", ["renja_dokumen_id", "version_number"], {
      unique: true,
      name: "renja_doc_ver_unique",
    });
    await queryInterface.addIndex("renja_dokumen_version", ["renja_dokumen_id", "is_current"], {
      name: "renja_doc_ver_current_idx",
    });

    // --- Line item versions ---
    await queryInterface.createTable("rkpd_item_version", {
      id: { type: BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      rkpd_item_id: { type: INTEGER, allowNull: false },
      version_seq: { type: INTEGER.UNSIGNED, allowNull: false },
      dokumen_version_id: { type: BIGINT.UNSIGNED, allowNull: true },
      snapshot_data: { type: JSON, allowNull: true },
      pagu_value: { type: DECIMAL(20, 2), allowNull: true },
      pagu_context_version_id: { type: BIGINT.UNSIGNED, allowNull: true },
      pagu_source: { type: STRING(32), allowNull: true },
      change_state: { type: STRING(32), allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      created_by: { type: INTEGER, allowNull: true },
      is_current: { type: BOOLEAN, allowNull: false, defaultValue: true },
    });
    await queryInterface.addIndex("rkpd_item_version", ["rkpd_item_id", "version_seq"], {
      unique: true,
      name: "rkpd_item_ver_seq_unique",
    });
    await queryInterface.addIndex("rkpd_item_version", ["rkpd_item_id", "is_current"], {
      name: "rkpd_item_ver_current_idx",
    });

    await queryInterface.createTable("renja_item_version", {
      id: { type: BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_item_id: { type: INTEGER, allowNull: false },
      version_seq: { type: INTEGER.UNSIGNED, allowNull: false },
      dokumen_version_id: { type: BIGINT.UNSIGNED, allowNull: true },
      snapshot_data: { type: JSON, allowNull: true },
      pagu_value: { type: DECIMAL(20, 2), allowNull: true },
      pagu_context_version_id: { type: BIGINT.UNSIGNED, allowNull: true },
      pagu_source: { type: STRING(32), allowNull: true },
      change_state: { type: STRING(32), allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      created_by: { type: INTEGER, allowNull: true },
      is_current: { type: BOOLEAN, allowNull: false, defaultValue: true },
    });
    await queryInterface.addIndex("renja_item_version", ["renja_item_id", "version_seq"], {
      unique: true,
      name: "renja_item_ver_seq_unique",
    });
    await queryInterface.addIndex("renja_item_version", ["renja_item_id", "is_current"], {
      name: "renja_item_ver_current_idx",
    });

    // --- Cascade trace ---
    await queryInterface.createTable("rkpd_renja_cascade_trace", {
      id: { type: BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      rkpd_item_id: { type: INTEGER, allowNull: false },
      renja_item_id: { type: INTEGER, allowNull: false },
      change_batch_id: { type: STRING(40), allowNull: false },
      cascade_type: { type: STRING(32), allowNull: false, defaultValue: "field_sync" },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("rkpd_renja_cascade_trace", ["rkpd_item_id"], {
      name: "cascade_trace_rkpd_item",
    });
    await queryInterface.addIndex("rkpd_renja_cascade_trace", ["renja_item_id"], {
      name: "cascade_trace_renja_item",
    });
    await queryInterface.addIndex("rkpd_renja_cascade_trace", ["change_batch_id"], {
      name: "cascade_trace_batch",
    });

    // --- Upgrade change log ---
    const desc = await queryInterface.describeTable("planning_line_item_change_log").catch(() => null);
    if (desc) {
      if (!desc.change_type) {
        await queryInterface.addColumn("planning_line_item_change_log", "change_type", {
          type: STRING(32),
          allowNull: true,
          comment: "manual | cascade_rkpd | system",
        });
      }
      if (!desc.version_before) {
        await queryInterface.addColumn("planning_line_item_change_log", "version_before", {
          type: INTEGER.UNSIGNED,
          allowNull: true,
        });
      }
      if (!desc.version_after) {
        await queryInterface.addColumn("planning_line_item_change_log", "version_after", {
          type: INTEGER.UNSIGNED,
          allowNull: true,
        });
      }
      if (!desc.entity_version_id) {
        await queryInterface.addColumn("planning_line_item_change_log", "entity_version_id", {
          type: BIGINT.UNSIGNED,
          allowNull: true,
        });
      }
      if (!desc.is_active_version) {
        await queryInterface.addColumn("planning_line_item_change_log", "is_active_version", {
          type: BOOLEAN,
          allowNull: true,
          comment: "Hasil revisi ini menjadi versi aktif baris",
        });
      }
    }

    // --- Item denormalized columns ---
    const rkpdItem = await queryInterface.describeTable("rkpd_item").catch(() => null);
    if (rkpdItem) {
      if (!rkpdItem.change_state) {
        await queryInterface.addColumn("rkpd_item", "change_state", {
          type: STRING(32),
          allowNull: true,
          defaultValue: "original",
        });
      }
      if (!rkpdItem.current_rkpd_item_version_id) {
        await queryInterface.addColumn("rkpd_item", "current_rkpd_item_version_id", {
          type: BIGINT.UNSIGNED,
          allowNull: true,
        });
      }
      if (!rkpdItem.pagu_source) {
        await queryInterface.addColumn("rkpd_item", "pagu_source", {
          type: STRING(32),
          allowNull: true,
          defaultValue: "rkpd",
        });
      }
      if (!rkpdItem.pagu_line_version_id) {
        await queryInterface.addColumn("rkpd_item", "pagu_line_version_id", {
          type: BIGINT.UNSIGNED,
          allowNull: true,
        });
      }
    }

    const renjaItem = await queryInterface.describeTable("renja_item").catch(() => null);
    if (renjaItem) {
      if (!renjaItem.change_state) {
        await queryInterface.addColumn("renja_item", "change_state", {
          type: STRING(32),
          allowNull: true,
          defaultValue: "original",
        });
      }
      if (!renjaItem.current_renja_item_version_id) {
        await queryInterface.addColumn("renja_item", "current_renja_item_version_id", {
          type: BIGINT.UNSIGNED,
          allowNull: true,
        });
      }
      if (!renjaItem.pagu_source) {
        await queryInterface.addColumn("renja_item", "pagu_source", {
          type: STRING(32),
          allowNull: true,
          defaultValue: "renja",
        });
      }
      if (!renjaItem.pagu_line_version_id) {
        await queryInterface.addColumn("renja_item", "pagu_line_version_id", {
          type: BIGINT.UNSIGNED,
          allowNull: true,
        });
      }
    }

    if (desc) {
      await queryInterface
        .addIndex("planning_line_item_change_log", ["entity_type", "entity_id", "created_at"], {
          name: "plicl_entity_created_idx",
        })
        .catch(() => {});
      await queryInterface
        .addIndex("planning_line_item_change_log", ["change_type", "created_at"], {
          name: "plicl_change_type_created_idx",
        })
        .catch(() => {});
      await queryInterface
        .addIndex("planning_line_item_change_log", ["entity_version_id"], {
          name: "plicl_entity_version_idx",
        })
        .catch(() => {});
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("planning_line_item_change_log", "plicl_entity_version_idx").catch(() => {});
    await queryInterface.removeIndex("planning_line_item_change_log", "plicl_change_type_created_idx").catch(() => {});
    await queryInterface.removeIndex("planning_line_item_change_log", "plicl_entity_created_idx").catch(() => {});

    const rkpdItem = await queryInterface.describeTable("rkpd_item").catch(() => null);
    if (rkpdItem?.pagu_line_version_id) await queryInterface.removeColumn("rkpd_item", "pagu_line_version_id");
    if (rkpdItem?.pagu_source) await queryInterface.removeColumn("rkpd_item", "pagu_source");
    if (rkpdItem?.current_rkpd_item_version_id) await queryInterface.removeColumn("rkpd_item", "current_rkpd_item_version_id");
    if (rkpdItem?.change_state) await queryInterface.removeColumn("rkpd_item", "change_state");

    const renjaItem = await queryInterface.describeTable("renja_item").catch(() => null);
    if (renjaItem?.pagu_line_version_id) await queryInterface.removeColumn("renja_item", "pagu_line_version_id");
    if (renjaItem?.pagu_source) await queryInterface.removeColumn("renja_item", "pagu_source");
    if (renjaItem?.current_renja_item_version_id) await queryInterface.removeColumn("renja_item", "current_renja_item_version_id");
    if (renjaItem?.change_state) await queryInterface.removeColumn("renja_item", "change_state");

    const desc = await queryInterface.describeTable("planning_line_item_change_log").catch(() => null);
    if (desc?.is_active_version) await queryInterface.removeColumn("planning_line_item_change_log", "is_active_version");
    if (desc?.entity_version_id) await queryInterface.removeColumn("planning_line_item_change_log", "entity_version_id");
    if (desc?.version_after) await queryInterface.removeColumn("planning_line_item_change_log", "version_after");
    if (desc?.version_before) await queryInterface.removeColumn("planning_line_item_change_log", "version_before");
    if (desc?.change_type) await queryInterface.removeColumn("planning_line_item_change_log", "change_type");

    await queryInterface.dropTable("rkpd_renja_cascade_trace");
    await queryInterface.dropTable("renja_item_version");
    await queryInterface.dropTable("rkpd_item_version");
    await queryInterface.dropTable("renja_dokumen_version");
    await queryInterface.dropTable("rkpd_dokumen_version");
  },
};
