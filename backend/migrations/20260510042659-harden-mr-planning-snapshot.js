"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_planning_snapshot";

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
    // CONTEXT LINKAGE
    // =========================
    await addColumnIfMissing("context_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "id",
    });

    // =========================
    // SNAPSHOT IDENTITY
    // =========================
    await addColumnIfMissing("snapshot_type", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "opd_id",
    });

    await addColumnIfMissing("snapshot_code", {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: "snapshot_type",
    });

    await addColumnIfMissing("snapshot_date", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "snapshot_code",
    });

    // =========================
    // RISK SUMMARY
    // =========================
    await addColumnIfMissing("total_priority_risk", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "total_risk",
    });

    await addColumnIfMissing("total_risk_above_appetite", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "total_priority_risk",
    });

    await addColumnIfMissing("total_risk_below_appetite", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "total_risk_above_appetite",
    });

    // =========================
    // MITIGATION SUMMARY
    // =========================
    await addColumnIfMissing("total_mitigation", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "total_unmitigated",
    });

    await addColumnIfMissing("total_mitigation_done", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "total_mitigation",
    });

    await addColumnIfMissing("total_mitigation_pending", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "total_mitigation_done",
    });

    await addColumnIfMissing("total_mitigation_overdue", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "total_mitigation_pending",
    });

    // =========================
    // MONITORING / EVENT / EFFECTIVENESS SUMMARY
    // =========================
    await addColumnIfMissing("total_monitoring", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "total_deviation",
    });

    await addColumnIfMissing("total_risk_event", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "total_monitoring",
    });

    await addColumnIfMissing("total_control_effective", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "total_risk_event",
    });

    await addColumnIfMissing("total_control_not_effective", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "total_control_effective",
    });

    // =========================
    // JSON SUMMARY
    // =========================
    await addColumnIfMissing("summary_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "snapshot_json",
    });

    await addColumnIfMissing("risk_map_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "summary_json",
    });

    await addColumnIfMissing("priority_risk_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "risk_map_json",
    });

    await addColumnIfMissing("mitigation_summary_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "priority_risk_json",
    });

    await addColumnIfMissing("monitoring_summary_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "mitigation_summary_json",
    });

    await addColumnIfMissing("event_summary_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "monitoring_summary_json",
    });

    await addColumnIfMissing("effectiveness_summary_json", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "event_summary_json",
    });

    // =========================
    // LOCK DETAIL
    // =========================
    await addColumnIfMissing("locked_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "is_locked",
    });

    await addColumnIfMissing("locked_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "locked_by",
    });

    // =========================
    // AUDIT TEKNIS
    // =========================
    await addColumnIfMissing("updated_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "locked_at",
    });

    // =========================
    // FOREIGN KEY
    // =========================
    await addFkIfMissing({
      constraintName: "fk_snap_ctx",
      fields: ["context_id"],
      referencedTable: "mr_planning_context",
    });

    // generated_by, approved_by, locked_by belum diberi FK
    // karena tabel users existing memakai campuran pola lama dan belum kita hardening khusus di fase ini.

    // =========================
    // INDEX
    // =========================
    await addIndexIfMissing(["context_id"], {
      name: "idx_snap_context",
    });

    await addIndexIfMissing(["snapshot_type"], {
      name: "idx_snap_type",
    });

    await addIndexIfMissing(["snapshot_code"], {
      name: "idx_snap_code",
    });

    await addIndexIfMissing(["snapshot_date"], {
      name: "idx_snap_date",
    });

    await addIndexIfMissing(["total_priority_risk"], {
      name: "idx_snap_priority_risk",
    });

    await addIndexIfMissing(["total_risk_above_appetite"], {
      name: "idx_snap_above_appetite",
    });

    await addIndexIfMissing(["total_mitigation_overdue"], {
      name: "idx_snap_mit_overdue",
    });

    await addIndexIfMissing(["total_risk_event"], {
      name: "idx_snap_risk_event",
    });

    await addIndexIfMissing(["total_control_not_effective"], {
      name: "idx_snap_control_not_effective",
    });

    await addIndexIfMissing(["locked_by"], {
      name: "idx_snap_locked_by",
    });

    await addIndexIfMissing(["locked_at"], {
      name: "idx_snap_locked_at",
    });

    await addIndexIfMissing(
      ["context_id", "periode_type", "periode_label", "tahun"],
      {
        name: "idx_snap_ctx_period_tahun",
      }
    );

    await addIndexIfMissing(
      ["renstra_id", "opd_id", "tahun", "periode_type", "periode_label"],
      {
        name: "idx_snap_scope_period",
      }
    );

    await addIndexIfMissing(
      ["context_id", "snapshot_type", "is_locked"],
      {
        name: "idx_snap_ctx_type_locked",
      }
    );
  },

  async down(queryInterface) {
    const tableName = "mr_planning_snapshot";

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
    await removeConstraintIfExists("fk_snap_ctx");

    // =========================
    // REMOVE INDEX
    // =========================
    const indexNames = [
      "idx_snap_ctx_type_locked",
      "idx_snap_scope_period",
      "idx_snap_ctx_period_tahun",
      "idx_snap_locked_at",
      "idx_snap_locked_by",
      "idx_snap_control_not_effective",
      "idx_snap_risk_event",
      "idx_snap_mit_overdue",
      "idx_snap_above_appetite",
      "idx_snap_priority_risk",
      "idx_snap_date",
      "idx_snap_code",
      "idx_snap_type",
      "idx_snap_context",
    ];

    for (const indexName of indexNames) {
      await removeIndexIfExists(indexName);
    }

    // =========================
    // REMOVE COLUMNS
    // =========================
    const columnNames = [
      "updated_by",
      "locked_at",
      "locked_by",
      "effectiveness_summary_json",
      "event_summary_json",
      "monitoring_summary_json",
      "mitigation_summary_json",
      "priority_risk_json",
      "risk_map_json",
      "summary_json",
      "total_control_not_effective",
      "total_control_effective",
      "total_risk_event",
      "total_monitoring",
      "total_mitigation_overdue",
      "total_mitigation_pending",
      "total_mitigation_done",
      "total_mitigation",
      "total_risk_below_appetite",
      "total_risk_above_appetite",
      "total_priority_risk",
      "snapshot_date",
      "snapshot_code",
      "snapshot_type",
      "context_id",
    ];

    for (const columnName of columnNames) {
      await removeColumnIfExists(columnName);
    }
  },
};