"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_planning_warning";

    const getColumns = async () => queryInterface.describeTable(tableName);

    const hasColumn = async (columnName) => {
      const columns = await getColumns();
      return Boolean(columns[columnName]);
    };

    const addColumnIfMissing = async (columnName, options) => {
      if (!(await hasColumn(columnName))) {
        await queryInterface.addColumn(tableName, columnName, options);
      }
    };

    const getIndexes = async () => queryInterface.showIndex(tableName);

    const hasIndex = async (indexName) => {
      const indexes = await getIndexes();
      return indexes.some((idx) => idx.name === indexName);
    };

    const addIndexIfMissing = async (fields, options) => {
      if (!(await hasIndex(options.name))) {
        await queryInterface.addIndex(tableName, fields, options);
      }
    };

    const hasConstraint = async (constraintName) => {
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :tableName
          AND CONSTRAINT_NAME = :constraintName
        LIMIT 1
        `,
        {
          replacements: {
            tableName,
            constraintName,
          },
        }
      );

      return rows.length > 0;
    };

    const addFkIfMissing = async ({
      constraintName,
      fields,
      referencedTable,
      referencedField = "id",
      onUpdate = "CASCADE",
      onDelete = "SET NULL",
    }) => {
      if (!(await hasConstraint(constraintName))) {
        await queryInterface.addConstraint(tableName, {
          fields,
          type: "foreign key",
          name: constraintName,
          references: {
            table: referencedTable,
            field: referencedField,
          },
          onUpdate,
          onDelete,
        });
      }
    };

    // =========================
    // EXTEND WARNING TYPE ENUM
    // =========================
    await queryInterface.changeColumn(tableName, "warning_type", {
      type: Sequelize.ENUM(
        "risk_level",
        "deviation",
        "overdue",
        "approval_pending",
        "mitigation_pending",
        "monitoring_pending",
        "broken_chain",
        "duplicate_data",
        "cross_system",

        // enterprise warning types
        "risk_above_appetite",
        "mitigation_overdue",
        "monitoring_overdue",
        "risk_event_occurred",
        "control_not_effective",
        "approval_delay",
        "snapshot_generation_failed",
        "deviation_high",
        "evaluation_overdue",
        "system_sync_failed"
      ),
      allowNull: false,
    });

    // =========================
    // ENTERPRISE LINKAGE
    // =========================
    await addColumnIfMissing("context_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "mr_planning_risk_id",
    });

    await addColumnIfMissing("mr_planning_mitigation_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "context_id",
    });

    await addColumnIfMissing("mr_planning_monitoring_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "mr_planning_mitigation_id",
    });

    // =========================
    // PERIOD SNAPSHOT
    // =========================
    await addColumnIfMissing("periode_type", {
      type: Sequelize.ENUM(
        "bulanan",
        "triwulan",
        "semester",
        "tahunan",
        "adhoc"
      ),
      allowNull: true,
      after: "mr_planning_monitoring_id",
    });

    await addColumnIfMissing("periode_label", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "periode_type",
    });

    await addColumnIfMissing("tahun", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "periode_label",
    });

    // =========================
    // WARNING DETAIL
    // =========================
    await addColumnIfMissing("warning_code", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "tahun",
    });

    await addColumnIfMissing("warning_source", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "warning_message",
    });

    await addColumnIfMissing("severity_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "warning_source",
    });

    await addColumnIfMissing("due_date", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "severity_ref_id",
    });

    await addColumnIfMissing("days_overdue", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      after: "due_date",
    });

    await addColumnIfMissing("related_snapshot_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "days_overdue",
    });

    // =========================
    // RESOLUTION
    // =========================
    await addColumnIfMissing("is_resolved", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "is_read",
    });

    await addColumnIfMissing("resolved_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "is_resolved",
    });

    await addColumnIfMissing("resolved_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "resolved_by",
    });

    await addColumnIfMissing("resolution_note", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "resolved_at",
    });

    // =========================
    // AUDIT TEKNIS
    // =========================
    await addColumnIfMissing("updated_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "read_at",
    });

    // =========================
    // FOREIGN KEYS WITH SHORT NAMES
    // =========================
    await addFkIfMissing({
      constraintName: "fk_warn_ctx",
      fields: ["context_id"],
      referencedTable: "mr_planning_context",
    });

    await addFkIfMissing({
      constraintName: "fk_warn_mit",
      fields: ["mr_planning_mitigation_id"],
      referencedTable: "mr_planning_mitigation",
    });

    await addFkIfMissing({
      constraintName: "fk_warn_mon",
      fields: ["mr_planning_monitoring_id"],
      referencedTable: "mr_planning_monitoring",
    });

    await addFkIfMissing({
      constraintName: "fk_warn_severity",
      fields: ["severity_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_warn_snapshot",
      fields: ["related_snapshot_id"],
      referencedTable: "mr_planning_snapshot",
    });

    // Catatan:
    // mr_planning_risk_id belum diberi FK di migration ini karena existing NOT NULL
    // dan tabel lama bisa saja memiliki data legacy/orphan.

    // =========================
    // INDEX WITH SHORT NAMES
    // =========================
    await addIndexIfMissing(["context_id"], {
      name: "idx_warn_context",
    });

    await addIndexIfMissing(["mr_planning_mitigation_id"], {
      name: "idx_warn_mitigation",
    });

    await addIndexIfMissing(["mr_planning_monitoring_id"], {
      name: "idx_warn_monitoring",
    });

    await addIndexIfMissing(["periode_type", "periode_label"], {
      name: "idx_warn_period",
    });

    await addIndexIfMissing(["tahun"], {
      name: "idx_warn_tahun",
    });

    await addIndexIfMissing(["warning_code"], {
      name: "idx_warn_code",
    });

    await addIndexIfMissing(["warning_source"], {
      name: "idx_warn_source_type",
    });

    await addIndexIfMissing(["severity_ref_id"], {
      name: "idx_warn_severity_ref",
    });

    await addIndexIfMissing(["due_date"], {
      name: "idx_warn_due_date",
    });

    await addIndexIfMissing(["days_overdue"], {
      name: "idx_warn_days_overdue",
    });

    await addIndexIfMissing(["related_snapshot_id"], {
      name: "idx_warn_snapshot",
    });

    await addIndexIfMissing(["is_resolved"], {
      name: "idx_warn_resolved",
    });

    await addIndexIfMissing(["resolved_by"], {
      name: "idx_warn_resolved_by",
    });

    await addIndexIfMissing(
      ["context_id", "warning_type", "warning_level", "is_resolved"],
      {
        name: "idx_warn_ctx_type_level_resolved",
      }
    );

    await addIndexIfMissing(
      ["context_id", "mr_planning_risk_id", "warning_type"],
      {
        name: "idx_warn_ctx_risk_type",
      }
    );

    await addIndexIfMissing(
      ["context_id", "due_date", "is_resolved"],
      {
        name: "idx_warn_ctx_due_resolved",
      }
    );

    await addIndexIfMissing(
      ["source_table", "source_id", "warning_type"],
      {
        name: "idx_warn_source_warning_type",
      }
    );
  },

  async down(queryInterface, Sequelize) {
    const tableName = "mr_planning_warning";

    const hasConstraint = async (constraintName) => {
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :tableName
          AND CONSTRAINT_NAME = :constraintName
        LIMIT 1
        `,
        {
          replacements: {
            tableName,
            constraintName,
          },
        }
      );

      return rows.length > 0;
    };

    const removeConstraintIfExists = async (constraintName) => {
      if (await hasConstraint(constraintName)) {
        await queryInterface.removeConstraint(tableName, constraintName);
      }
    };

    const indexes = await queryInterface.showIndex(tableName);
    const hasIndex = (indexName) => indexes.some((idx) => idx.name === indexName);

    const removeIndexIfExists = async (indexName) => {
      if (hasIndex(indexName)) {
        await queryInterface.removeIndex(tableName, indexName);
      }
    };

    const columns = await queryInterface.describeTable(tableName);

    const removeColumnIfExists = async (columnName) => {
      if (columns[columnName]) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    };

    // =========================
    // REMOVE FK FIRST
    // =========================
    const constraints = [
      "fk_warn_snapshot",
      "fk_warn_severity",
      "fk_warn_mon",
      "fk_warn_mit",
      "fk_warn_ctx",
    ];

    for (const constraintName of constraints) {
      await removeConstraintIfExists(constraintName);
    }

    // =========================
    // REMOVE INDEX
    // =========================
    const indexNames = [
      "idx_warn_source_warning_type",
      "idx_warn_ctx_due_resolved",
      "idx_warn_ctx_risk_type",
      "idx_warn_ctx_type_level_resolved",
      "idx_warn_resolved_by",
      "idx_warn_resolved",
      "idx_warn_snapshot",
      "idx_warn_days_overdue",
      "idx_warn_due_date",
      "idx_warn_severity_ref",
      "idx_warn_source_type",
      "idx_warn_code",
      "idx_warn_tahun",
      "idx_warn_period",
      "idx_warn_monitoring",
      "idx_warn_mitigation",
      "idx_warn_context",
    ];

    for (const indexName of indexNames) {
      await removeIndexIfExists(indexName);
    }

    // =========================
    // REMOVE COLUMNS
    // =========================
    const columnNames = [
      "updated_by",
      "resolution_note",
      "resolved_at",
      "resolved_by",
      "is_resolved",
      "related_snapshot_id",
      "days_overdue",
      "due_date",
      "severity_ref_id",
      "warning_source",
      "warning_code",
      "tahun",
      "periode_label",
      "periode_type",
      "mr_planning_monitoring_id",
      "mr_planning_mitigation_id",
      "context_id",
    ];

    for (const columnName of columnNames) {
      await removeColumnIfExists(columnName);
    }

    // =========================
    // RESTORE OLD WARNING TYPE ENUM
    // =========================
    await queryInterface.changeColumn(tableName, "warning_type", {
      type: Sequelize.ENUM(
        "risk_level",
        "deviation",
        "overdue",
        "approval_pending",
        "mitigation_pending",
        "monitoring_pending",
        "broken_chain",
        "duplicate_data",
        "cross_system"
      ),
      allowNull: false,
    });
  },
};