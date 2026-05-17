"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_planning_dashboard_summary";

    const table = await queryInterface.describeTable(tableName);

    const addColumnIfNotExists = async (columnName, definition) => {
      if (!table[columnName]) {
        await queryInterface.addColumn(tableName, columnName, definition);
      }
    };

    const indexes = await queryInterface.showIndex(tableName);
    const indexNames = indexes.map((idx) => idx.name);

    const addIndexIfNotExists = async (fields, indexName) => {
      if (!indexNames.includes(indexName)) {
        await queryInterface.addIndex(tableName, fields, {
          name: indexName,
        });
      }
    };

    const [fkRows] = await queryInterface.sequelize.query(`
      SELECT
        CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    const fkNames = fkRows.map((row) => row.CONSTRAINT_NAME);

    const addFkIfNotExists = async ({
      columnName,
      constraintName,
      referencedTable,
      referencedColumn = "id",
      onUpdate = "CASCADE",
      onDelete = "SET NULL",
    }) => {
      if (!fkNames.includes(constraintName)) {
        await queryInterface.addConstraint(tableName, {
          fields: [columnName],
          type: "foreign key",
          name: constraintName,
          references: {
            table: referencedTable,
            field: referencedColumn,
          },
          onUpdate,
          onDelete,
        });
      }
    };

    // =====================================================
    // 1. RELASI CONTEXT & SNAPSHOT
    // =====================================================

    await addColumnIfNotExists("context_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "id",
    });

    await addColumnIfNotExists("last_snapshot_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "summary_json",
    });

    // =====================================================
    // 2. TIPE SUMMARY
    // =====================================================

    await addColumnIfNotExists("summary_type", {
      type: Sequelize.ENUM(
        "executive",
        "opd",
        "renstra",
        "risk_owner",
        "operasional",
        "snapshot",
        "adhoc"
      ),
      allowNull: false,
      defaultValue: "executive",
      after: "context_id",
    });

    // =====================================================
    // 3. ANGKA TURUNAN SNAPSHOT
    // =====================================================

    await addColumnIfNotExists("risk_priority_total", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "risk_total",
    });

    await addColumnIfNotExists("risk_above_appetite_total", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "risk_priority_total",
    });

    await addColumnIfNotExists("risk_below_appetite_total", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "risk_above_appetite_total",
    });

    await addColumnIfNotExists("mitigation_pending", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "mitigation_done",
    });

    await addColumnIfNotExists("monitoring_total", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "mitigation_overdue",
    });

    await addColumnIfNotExists("risk_event_total", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "monitoring_total",
    });

    await addColumnIfNotExists("control_effective_total", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "risk_event_total",
    });

    await addColumnIfNotExists("control_not_effective_total", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "control_effective_total",
    });

    // =====================================================
    // 4. JSON DASHBOARD / TREND / SNAPSHOT
    // =====================================================

    await addColumnIfNotExists("risk_trend_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "summary_json",
    });

    await addColumnIfNotExists("mitigation_trend_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "risk_trend_json",
    });

    await addColumnIfNotExists("monitoring_trend_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "mitigation_trend_json",
    });

    await addColumnIfNotExists("warning_trend_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "monitoring_trend_json",
    });

    await addColumnIfNotExists("approval_trend_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "warning_trend_json",
    });

    await addColumnIfNotExists("snapshot_summary_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "approval_trend_json",
    });

    // =====================================================
    // 5. GENERATED / AUDIT FIELD
    // =====================================================

    await addColumnIfNotExists("last_generated_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "last_sync_at",
    });

    await addColumnIfNotExists("updated_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "generated_by",
    });

    // =====================================================
    // 6. INDEX
    // =====================================================

    await addIndexIfNotExists(["context_id"], "idx_mr_dash_ctx");
    await addIndexIfNotExists(["last_snapshot_id"], "idx_mr_dash_snap");
    await addIndexIfNotExists(["summary_type"], "idx_mr_dash_type");

    await addIndexIfNotExists(
      ["context_id", "periode_type", "periode_label"],
      "idx_mr_dash_ctx_period"
    );

    await addIndexIfNotExists(
      ["renstra_id", "tahun", "periode_type"],
      "idx_mr_dash_ren_period"
    );

    await addIndexIfNotExists(
      ["opd_id", "tahun", "periode_type"],
      "idx_mr_dash_opd_period"
    );

    await addIndexIfNotExists(["updated_by"], "idx_mr_dash_upd_by");

    // =====================================================
    // 7. FOREIGN KEY
    // =====================================================

    await addFkIfNotExists({
      columnName: "context_id",
      constraintName: "fk_mr_dash_ctx",
      referencedTable: "mr_planning_context",
      referencedColumn: "id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await addFkIfNotExists({
      columnName: "last_snapshot_id",
      constraintName: "fk_mr_dash_snap",
      referencedTable: "mr_planning_snapshot",
      referencedColumn: "id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await addFkIfNotExists({
      columnName: "updated_by",
      constraintName: "fk_mr_dash_upd_by",
      referencedTable: "users",
      referencedColumn: "id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    const tableName = "mr_planning_dashboard_summary";

    const table = await queryInterface.describeTable(tableName);

    const indexes = await queryInterface.showIndex(tableName);
    const indexNames = indexes.map((idx) => idx.name);

    const removeIndexIfExists = async (indexName) => {
      if (indexNames.includes(indexName)) {
        await queryInterface.removeIndex(tableName, indexName);
      }
    };

    const [fkRows] = await queryInterface.sequelize.query(`
      SELECT
        CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    const fkNames = fkRows.map((row) => row.CONSTRAINT_NAME);

    const removeConstraintIfExists = async (constraintName) => {
      if (fkNames.includes(constraintName)) {
        await queryInterface.removeConstraint(tableName, constraintName);
      }
    };

    const removeColumnIfExists = async (columnName) => {
      if (table[columnName]) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    };

    await removeConstraintIfExists("fk_mr_dash_ctx");
    await removeConstraintIfExists("fk_mr_dash_snap");
    await removeConstraintIfExists("fk_mr_dash_upd_by");

    await removeIndexIfExists("idx_mr_dash_ctx");
    await removeIndexIfExists("idx_mr_dash_snap");
    await removeIndexIfExists("idx_mr_dash_type");
    await removeIndexIfExists("idx_mr_dash_ctx_period");
    await removeIndexIfExists("idx_mr_dash_ren_period");
    await removeIndexIfExists("idx_mr_dash_opd_period");
    await removeIndexIfExists("idx_mr_dash_upd_by");

    await removeColumnIfExists("context_id");
    await removeColumnIfExists("summary_type");
    await removeColumnIfExists("last_snapshot_id");

    await removeColumnIfExists("risk_priority_total");
    await removeColumnIfExists("risk_above_appetite_total");
    await removeColumnIfExists("risk_below_appetite_total");

    await removeColumnIfExists("mitigation_pending");
    await removeColumnIfExists("monitoring_total");
    await removeColumnIfExists("risk_event_total");
    await removeColumnIfExists("control_effective_total");
    await removeColumnIfExists("control_not_effective_total");

    await removeColumnIfExists("risk_trend_json");
    await removeColumnIfExists("mitigation_trend_json");
    await removeColumnIfExists("monitoring_trend_json");
    await removeColumnIfExists("warning_trend_json");
    await removeColumnIfExists("approval_trend_json");
    await removeColumnIfExists("snapshot_summary_json");

    await removeColumnIfExists("last_generated_at");
    await removeColumnIfExists("updated_by");
  },
};