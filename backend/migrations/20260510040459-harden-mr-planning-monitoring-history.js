"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_planning_monitoring_history";

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
    // CONTEXT / RISK / MITIGATION LINKAGE
    // =========================
    await addColumnIfMissing("context_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "mr_planning_monitoring_id",
    });

    await addColumnIfMissing("mr_planning_risk_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "context_id",
    });

    await addColumnIfMissing("mr_planning_mitigation_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "mr_planning_risk_id",
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
      after: "mr_planning_mitigation_id",
    });

    await addColumnIfMissing("periode_label", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "periode_type",
    });

    // =========================
    // ACTION TRACE
    // =========================
    await addColumnIfMissing("action_type", {
      type: Sequelize.ENUM(
        "create",
        "update",
        "revisi",
        "verifikasi",
        "approve",
        "tolak",
        "rebuild",
        "restore",
        "sync",
        "import",
        "system"
      ),
      allowNull: true,
      after: "status_revisi",
    });

    // =========================
    // AUDIT LINKAGE
    // =========================
    await addColumnIfMissing("audit_event_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "action_type",
    });

    // =========================
    // FOREIGN KEYS WITH SHORT NAMES
    // =========================
    await addFkIfMissing({
      constraintName: "fk_mon_hist_ctx",
      fields: ["context_id"],
      referencedTable: "mr_planning_context",
    });

    await addFkIfMissing({
      constraintName: "fk_mon_hist_risk",
      fields: ["mr_planning_risk_id"],
      referencedTable: "mr_planning_risk",
    });

    await addFkIfMissing({
      constraintName: "fk_mon_hist_mit",
      fields: ["mr_planning_mitigation_id"],
      referencedTable: "mr_planning_mitigation",
    });

    // Catatan:
    // mr_planning_monitoring_id belum diberi FK di migration ini
    // karena tabel history existing bisa saja memiliki data legacy/orphan.
    // audit_event_id belum diberi FK karena tabel audit global final belum dikunci.

    // =========================
    // INDEX
    // =========================
    await addIndexIfMissing(["context_id"], {
      name: "idx_mon_hist_context",
    });

    await addIndexIfMissing(["mr_planning_risk_id"], {
      name: "idx_mon_hist_risk",
    });

    await addIndexIfMissing(["mr_planning_mitigation_id"], {
      name: "idx_mon_hist_mitigation",
    });

    await addIndexIfMissing(["periode_type", "periode_label"], {
      name: "idx_mon_hist_period",
    });

    await addIndexIfMissing(["action_type"], {
      name: "idx_mon_hist_action",
    });

    await addIndexIfMissing(["audit_event_id"], {
      name: "idx_mon_hist_audit_event",
    });

    await addIndexIfMissing(
      [
        "context_id",
        "mr_planning_risk_id",
        "mr_planning_mitigation_id",
        "periode_type",
        "periode_label",
        "status_revisi",
      ],
      {
        name: "idx_mon_hist_ctx_risk_mit_period",
      }
    );

    await addIndexIfMissing(
      ["mr_planning_monitoring_id", "action_type"],
      {
        name: "idx_mon_hist_monitoring_action",
      }
    );
  },

  async down(queryInterface) {
    const tableName = "mr_planning_monitoring_history";

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
      "fk_mon_hist_mit",
      "fk_mon_hist_risk",
      "fk_mon_hist_ctx",
    ];

    for (const constraintName of constraints) {
      await removeConstraintIfExists(constraintName);
    }

    // =========================
    // REMOVE INDEX
    // =========================
    const indexNames = [
      "idx_mon_hist_monitoring_action",
      "idx_mon_hist_ctx_risk_mit_period",
      "idx_mon_hist_audit_event",
      "idx_mon_hist_action",
      "idx_mon_hist_period",
      "idx_mon_hist_mitigation",
      "idx_mon_hist_risk",
      "idx_mon_hist_context",
    ];

    for (const indexName of indexNames) {
      await removeIndexIfExists(indexName);
    }

    // =========================
    // REMOVE COLUMNS
    // =========================
    const columnNames = [
      "audit_event_id",
      "action_type",
      "periode_label",
      "periode_type",
      "mr_planning_mitigation_id",
      "mr_planning_risk_id",
      "context_id",
    ];

    for (const columnName of columnNames) {
      await removeColumnIfExists(columnName);
    }
  },
};