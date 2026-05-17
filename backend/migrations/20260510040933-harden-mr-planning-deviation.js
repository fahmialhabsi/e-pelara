"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_planning_deviation";

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
    // CONTEXT / MONITORING LINKAGE
    // =========================
    await addColumnIfMissing("context_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "mr_planning_risk_id",
    });

    await addColumnIfMissing("mr_planning_monitoring_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "context_id",
    });

    // =========================
    // PERIODISASI
    // =========================
    await addColumnIfMissing("periode_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "tahun",
    });

    await addColumnIfMissing("periode_type", {
      type: Sequelize.ENUM(
        "bulanan",
        "triwulan",
        "semester",
        "tahunan",
        "adhoc"
      ),
      allowNull: true,
      after: "periode_id",
    });

    await addColumnIfMissing("periode_label", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "periode_type",
    });

    await addColumnIfMissing("periode_awal", {
      type: Sequelize.DATEONLY,
      allowNull: true,
      after: "periode_label",
    });

    await addColumnIfMissing("periode_akhir", {
      type: Sequelize.DATEONLY,
      allowNull: true,
      after: "periode_awal",
    });

    // =========================
    // DEVIATION GENERAL
    // =========================
    await addColumnIfMissing("deviation_type", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "periode_akhir",
    });

    await addColumnIfMissing("deviation_source", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "deviation_type",
    });

    await addColumnIfMissing("deviation_description", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "deviation_source",
    });

    await addColumnIfMissing("expected_value", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
      defaultValue: 0,
      after: "deviation_description",
    });

    await addColumnIfMissing("actual_value", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
      defaultValue: 0,
      after: "expected_value",
    });

    await addColumnIfMissing("deviation_value", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
      defaultValue: 0,
      after: "actual_value",
    });

    await addColumnIfMissing("deviation_percent", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      after: "deviation_value",
    });

    // =========================
    // SEVERITY
    // =========================
    await addColumnIfMissing("severity_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "deviation_percent",
    });

    await addColumnIfMissing("severity_level", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "severity_ref_id",
    });

    await addColumnIfMissing("severity_color", {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: "severity_level",
    });

    // =========================
    // FOLLOW UP
    // =========================
    await addColumnIfMissing("recommendation", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "severity_color",
    });

    await addColumnIfMissing("follow_up_status", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "recommendation",
    });

    await addColumnIfMissing("owner_user_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "follow_up_status",
    });

    await addColumnIfMissing("owner_division_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "owner_user_id",
    });

    // =========================
    // RISK EVENT / LEVEL CHANGE
    // =========================
    await addColumnIfMissing("risk_event_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "owner_division_id",
    });

    await addColumnIfMissing("risk_level_before", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "risk_event_id",
    });

    await addColumnIfMissing("risk_level_after", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "risk_level_before",
    });

    await addColumnIfMissing("risk_level_change", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "risk_level_after",
    });

    await addColumnIfMissing("is_above_appetite", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "risk_level_change",
    });

    // =========================
    // AUDIT TEKNIS
    // =========================
    await addColumnIfMissing("created_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "calculated_at",
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
      constraintName: "fk_dev_ctx",
      fields: ["context_id"],
      referencedTable: "mr_planning_context",
    });

    await addFkIfMissing({
      constraintName: "fk_dev_monitoring",
      fields: ["mr_planning_monitoring_id"],
      referencedTable: "mr_planning_monitoring",
    });

    await addFkIfMissing({
      constraintName: "fk_dev_severity",
      fields: ["severity_ref_id"],
      referencedTable: "mr_reference_items",
    });

    // Catatan:
    // mr_planning_risk_id belum diberi FK di migration ini
    // karena tabel existing bisa saja memiliki data legacy/orphan.
    // risk_event_id belum diberi FK karena tabel mr_planning_risk_event belum dibuat.

    // =========================
    // INDEX WITH SHORT NAMES
    // =========================
    await addIndexIfMissing(["context_id"], {
      name: "idx_dev_context",
    });

    await addIndexIfMissing(["mr_planning_monitoring_id"], {
      name: "idx_dev_monitoring",
    });

    await addIndexIfMissing(["periode_id"], {
      name: "idx_dev_periode_id",
    });

    await addIndexIfMissing(["periode_type", "periode_label"], {
      name: "idx_dev_period",
    });

    await addIndexIfMissing(["periode_awal", "periode_akhir"], {
      name: "idx_dev_period_range",
    });

    await addIndexIfMissing(["deviation_type"], {
      name: "idx_dev_type",
    });

    await addIndexIfMissing(["deviation_source"], {
      name: "idx_dev_source",
    });

    await addIndexIfMissing(["severity_ref_id"], {
      name: "idx_dev_severity_ref",
    });

    await addIndexIfMissing(["severity_level"], {
      name: "idx_dev_severity_level",
    });

    await addIndexIfMissing(["follow_up_status"], {
      name: "idx_dev_follow_status",
    });

    await addIndexIfMissing(["owner_user_id"], {
      name: "idx_dev_owner_user",
    });

    await addIndexIfMissing(["owner_division_id"], {
      name: "idx_dev_owner_division",
    });

    await addIndexIfMissing(["risk_event_id"], {
      name: "idx_dev_risk_event",
    });

    await addIndexIfMissing(["risk_level_before"], {
      name: "idx_dev_level_before",
    });

    await addIndexIfMissing(["risk_level_after"], {
      name: "idx_dev_level_after",
    });

    await addIndexIfMissing(["risk_level_change"], {
      name: "idx_dev_level_change",
    });

    await addIndexIfMissing(["is_above_appetite"], {
      name: "idx_dev_above_appetite",
    });

    await addIndexIfMissing(
      ["context_id", "mr_planning_risk_id", "mr_planning_monitoring_id"],
      {
        name: "idx_dev_ctx_risk_monitoring",
      }
    );

    await addIndexIfMissing(
      ["context_id", "periode_type", "periode_label", "deviation_type"],
      {
        name: "idx_dev_ctx_period_type",
      }
    );

    await addIndexIfMissing(
      ["context_id", "severity_level", "follow_up_status"],
      {
        name: "idx_dev_ctx_severity_follow",
      }
    );
  },

  async down(queryInterface) {
    const tableName = "mr_planning_deviation";

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
      "fk_dev_severity",
      "fk_dev_monitoring",
      "fk_dev_ctx",
    ];

    for (const constraintName of constraints) {
      await removeConstraintIfExists(constraintName);
    }

    // =========================
    // REMOVE INDEX
    // =========================
    const indexNames = [
      "idx_dev_ctx_severity_follow",
      "idx_dev_ctx_period_type",
      "idx_dev_ctx_risk_monitoring",
      "idx_dev_above_appetite",
      "idx_dev_level_change",
      "idx_dev_level_after",
      "idx_dev_level_before",
      "idx_dev_risk_event",
      "idx_dev_owner_division",
      "idx_dev_owner_user",
      "idx_dev_follow_status",
      "idx_dev_severity_level",
      "idx_dev_severity_ref",
      "idx_dev_source",
      "idx_dev_type",
      "idx_dev_period_range",
      "idx_dev_period",
      "idx_dev_periode_id",
      "idx_dev_monitoring",
      "idx_dev_context",
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
      "is_above_appetite",
      "risk_level_change",
      "risk_level_after",
      "risk_level_before",
      "risk_event_id",
      "owner_division_id",
      "owner_user_id",
      "follow_up_status",
      "recommendation",
      "severity_color",
      "severity_level",
      "severity_ref_id",
      "deviation_percent",
      "deviation_value",
      "actual_value",
      "expected_value",
      "deviation_description",
      "deviation_source",
      "deviation_type",
      "periode_akhir",
      "periode_awal",
      "periode_label",
      "periode_type",
      "periode_id",
      "mr_planning_monitoring_id",
      "context_id",
    ];

    for (const columnName of columnNames) {
      await removeColumnIfExists(columnName);
    }
  },
};