"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_planning_approval_monitoring";

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
    // ENTERPRISE MODULE IDENTIFIER
    // =========================
    await addColumnIfMissing("module_name", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "id",
    });

    await addColumnIfMissing("record_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "module_name",
    });

    await addColumnIfMissing("source_table", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "entity_id",
    });

    await addColumnIfMissing("source_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "source_table",
    });

    await addColumnIfMissing("workflow_type", {
      type: Sequelize.ENUM(
        "context",
        "risk",
        "analysis",
        "root_cause",
        "mitigation",
        "monitoring",
        "deviation",
        "evaluation",
        "snapshot",
        "dashboard_summary",
        "system"
      ),
      allowNull: true,
      after: "source_id",
    });

    // =========================
    // CONTEXT LINKAGE
    // =========================
    await addColumnIfMissing("context_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "workflow_type",
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
      after: "context_id",
    });

    await addColumnIfMissing("periode_label", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "periode_type",
    });

    // =========================
    // WORKFLOW DETAIL
    // =========================
    await addColumnIfMissing("approval_stage", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "current_step",
    });

    await addColumnIfMissing("rejection_reason", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "approval_note",
    });

    // =========================
    // AUDIT LINKAGE
    // =========================
    await addColumnIfMissing("audit_event_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "rejection_reason",
    });

    await addColumnIfMissing("created_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "is_locked",
    });

    await addColumnIfMissing("updated_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "created_by",
    });

    // =========================
    // FOREIGN KEYS WITH SHORT NAMES
    // =========================
    await addFkIfMissing({
      constraintName: "fk_appr_ctx",
      fields: ["context_id"],
      referencedTable: "mr_planning_context",
    });

    await addFkIfMissing({
      constraintName: "fk_appr_risk",
      fields: ["mr_planning_risk_id"],
      referencedTable: "mr_planning_risk",
      onDelete: "RESTRICT",
    });

    // audit_event_id belum diberi FK karena audit global final belum dikunci.

    // =========================
    // INDEX WITH SHORT NAMES
    // =========================
    await addIndexIfMissing(["module_name"], {
      name: "idx_appr_module",
    });

    await addIndexIfMissing(["record_id"], {
      name: "idx_appr_record",
    });

    await addIndexIfMissing(["module_name", "record_id"], {
      name: "idx_appr_module_record",
    });

    await addIndexIfMissing(["context_id"], {
      name: "idx_appr_context",
    });

    await addIndexIfMissing(["source_table", "source_id"], {
      name: "idx_appr_source",
    });

    await addIndexIfMissing(["workflow_type"], {
      name: "idx_appr_workflow_type",
    });

    await addIndexIfMissing(["periode_type", "periode_label"], {
      name: "idx_appr_period",
    });

    await addIndexIfMissing(["approval_stage"], {
      name: "idx_appr_stage",
    });

    await addIndexIfMissing(["audit_event_id"], {
      name: "idx_appr_audit_event",
    });

    await addIndexIfMissing(
      ["workflow_type", "status_revisi", "approval_stage"],
      {
        name: "idx_appr_workflow_status_stage",
      }
    );

    await addIndexIfMissing(
      ["context_id", "mr_planning_risk_id", "workflow_type", "status_revisi"],
      {
        name: "idx_appr_ctx_risk_workflow_status",
      }
    );

    await addIndexIfMissing(
      ["source_table", "source_id", "status_revisi"],
      {
        name: "idx_appr_source_status",
      }
    );
  },

  async down(queryInterface) {
    const tableName = "mr_planning_approval_monitoring";

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
    const constraints = ["fk_appr_risk", "fk_appr_ctx"];

    for (const constraintName of constraints) {
      await removeConstraintIfExists(constraintName);
    }

    // =========================
    // REMOVE INDEX
    // =========================
    const indexNames = [
      "idx_appr_source_status",
      "idx_appr_ctx_risk_workflow_status",
      "idx_appr_workflow_status_stage",
      "idx_appr_audit_event",
      "idx_appr_stage",
      "idx_appr_period",
      "idx_appr_workflow_type",
      "idx_appr_source",
      "idx_appr_context",
      "idx_appr_module_record",
      "idx_appr_record",
      "idx_appr_module",
    ];

    for (const indexName of indexNames) {
      await removeIndexIfExists(indexName);
    }

    // =========================
    // REMOVE COLUMNS
    // =========================
    const columnNames = [
      "updated_by",
      "created_by",
      "audit_event_id",
      "rejection_reason",
      "approval_stage",
      "periode_label",
      "periode_type",
      "context_id",
      "workflow_type",
      "source_id",
      "source_table",
      "record_id",
      "module_name",
    ];

    for (const columnName of columnNames) {
      await removeColumnIfExists(columnName);
    }
  },
};