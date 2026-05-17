"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_cross_system_link";

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
    // 1. RELASI KE KONTEKS DAN ENTITAS MR e-Pelara
    // =====================================================

    await addColumnIfNotExists("context_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "id",
    });

    await addColumnIfNotExists("mr_planning_risk_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "context_id",
    });

    await addColumnIfNotExists("mr_planning_mitigation_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "mr_planning_risk_id",
    });

    await addColumnIfNotExists("mr_planning_monitoring_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "mr_planning_mitigation_id",
    });

    // =====================================================
    // 2. REFERENSI TARGET LINTAS SISTEM
    // =====================================================

    await addColumnIfNotExists("target_reference_code", {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: "target_id",
    });

    await addColumnIfNotExists("target_reference_label", {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: "target_reference_code",
    });

    // =====================================================
    // 3. STATUS SINKRONISASI LINTAS SISTEM
    // =====================================================

    await addColumnIfNotExists("sync_status", {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "pending",
      after: "link_status",
    });

    await addColumnIfNotExists("last_sync_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "sync_status",
    });

    await addColumnIfNotExists("sync_error_message", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "last_sync_at",
    });

    await addColumnIfNotExists("metadata_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "sync_error_message",
    });

    // =====================================================
    // 4. INDEX TAMBAHAN
    // =====================================================

    await addIndexIfNotExists(["context_id"], "idx_mr_xlink_ctx");

    await addIndexIfNotExists(
      ["mr_planning_risk_id"],
      "idx_mr_xlink_risk"
    );

    await addIndexIfNotExists(
      ["mr_planning_mitigation_id"],
      "idx_mr_xlink_mit"
    );

    await addIndexIfNotExists(
      ["mr_planning_monitoring_id"],
      "idx_mr_xlink_mon"
    );

    await addIndexIfNotExists(
      ["target_reference_code"],
      "idx_mr_xlink_ref_code"
    );

    await addIndexIfNotExists(["sync_status"], "idx_mr_xlink_sync");

    await addIndexIfNotExists(
      ["source_system", "target_system", "link_type"],
      "idx_mr_xlink_sys_type"
    );

    await addIndexIfNotExists(
      ["context_id", "link_type", "link_status"],
      "idx_mr_xlink_ctx_status"
    );

    // =====================================================
    // 5. FOREIGN KEY PENDEK
    // =====================================================

    await addFkIfNotExists({
      columnName: "context_id",
      constraintName: "fk_xlink_ctx",
      referencedTable: "mr_planning_context",
      referencedColumn: "id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await addFkIfNotExists({
      columnName: "mr_planning_risk_id",
      constraintName: "fk_xlink_risk",
      referencedTable: "mr_planning_risk",
      referencedColumn: "id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await addFkIfNotExists({
      columnName: "mr_planning_mitigation_id",
      constraintName: "fk_xlink_mit",
      referencedTable: "mr_planning_mitigation",
      referencedColumn: "id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await addFkIfNotExists({
      columnName: "mr_planning_monitoring_id",
      constraintName: "fk_xlink_mon",
      referencedTable: "mr_planning_monitoring",
      referencedColumn: "id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    const tableName = "mr_cross_system_link";

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

    await removeConstraintIfExists("fk_xlink_ctx");
    await removeConstraintIfExists("fk_xlink_risk");
    await removeConstraintIfExists("fk_xlink_mit");
    await removeConstraintIfExists("fk_xlink_mon");

    await removeIndexIfExists("idx_mr_xlink_ctx");
    await removeIndexIfExists("idx_mr_xlink_risk");
    await removeIndexIfExists("idx_mr_xlink_mit");
    await removeIndexIfExists("idx_mr_xlink_mon");
    await removeIndexIfExists("idx_mr_xlink_ref_code");
    await removeIndexIfExists("idx_mr_xlink_sync");
    await removeIndexIfExists("idx_mr_xlink_sys_type");
    await removeIndexIfExists("idx_mr_xlink_ctx_status");

    await removeColumnIfExists("context_id");
    await removeColumnIfExists("mr_planning_risk_id");
    await removeColumnIfExists("mr_planning_mitigation_id");
    await removeColumnIfExists("mr_planning_monitoring_id");

    await removeColumnIfExists("target_reference_code");
    await removeColumnIfExists("target_reference_label");

    await removeColumnIfExists("sync_status");
    await removeColumnIfExists("last_sync_at");
    await removeColumnIfExists("sync_error_message");
    await removeColumnIfExists("metadata_json");
  },
};