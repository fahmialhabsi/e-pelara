"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const columnExists = async (tableName, columnName) => {
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :tableName
          AND COLUMN_NAME = :columnName
        `,
        {
          replacements: { tableName, columnName },
        }
      );

      return rows.length > 0;
    };

    const indexExists = async (tableName, indexName) => {
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT INDEX_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :tableName
          AND INDEX_NAME = :indexName
        `,
        {
          replacements: { tableName, indexName },
        }
      );

      return rows.length > 0;
    };

    const addColumnIfMissing = async (tableName, columnName, definition) => {
      if (!(await columnExists(tableName, columnName))) {
        await queryInterface.addColumn(tableName, columnName, definition);
      }
    };

    // =====================================================
    // mr_planning_risk — workflow enterprise fields
    // =====================================================
    await addColumnIfMissing("mr_planning_risk", "alasan_revisi", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "status_revisi",
    });

    await addColumnIfMissing("mr_planning_risk", "dibuat_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "last_revised_by",
    });

    await addColumnIfMissing("mr_planning_risk", "diverifikasi_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "dibuat_oleh",
    });

    await addColumnIfMissing("mr_planning_risk", "disetujui_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "diverifikasi_oleh",
    });

    await addColumnIfMissing("mr_planning_risk", "ditolak_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "disetujui_oleh",
    });

    await addColumnIfMissing("mr_planning_risk", "dibuat_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "ditolak_oleh",
    });

    await addColumnIfMissing("mr_planning_risk", "diverifikasi_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "dibuat_pada",
    });

    await addColumnIfMissing("mr_planning_risk", "disetujui_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "diverifikasi_pada",
    });

    await addColumnIfMissing("mr_planning_risk", "ditolak_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "disetujui_pada",
    });

    // =====================================================
    // mr_planning_monitoring — tahun untuk filter periodik
    // =====================================================
    await addColumnIfMissing("mr_planning_monitoring", "tahun", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "mr_planning_mitigation_id",
    });

    if (!(await indexExists("mr_planning_monitoring", "idx_mr_monitoring_tahun"))) {
      await queryInterface.addIndex("mr_planning_monitoring", ["tahun"], {
        name: "idx_mr_monitoring_tahun",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const columnExists = async (tableName, columnName) => {
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :tableName
          AND COLUMN_NAME = :columnName
        `,
        {
          replacements: { tableName, columnName },
        }
      );

      return rows.length > 0;
    };

    const indexExists = async (tableName, indexName) => {
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT INDEX_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :tableName
          AND INDEX_NAME = :indexName
        `,
        {
          replacements: { tableName, indexName },
        }
      );

      return rows.length > 0;
    };

    const removeColumnIfExists = async (tableName, columnName) => {
      if (await columnExists(tableName, columnName)) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    };

    if (await indexExists("mr_planning_monitoring", "idx_mr_monitoring_tahun")) {
      await queryInterface.removeIndex(
        "mr_planning_monitoring",
        "idx_mr_monitoring_tahun"
      );
    }

    await removeColumnIfExists("mr_planning_monitoring", "tahun");

    await removeColumnIfExists("mr_planning_risk", "ditolak_pada");
    await removeColumnIfExists("mr_planning_risk", "disetujui_pada");
    await removeColumnIfExists("mr_planning_risk", "diverifikasi_pada");
    await removeColumnIfExists("mr_planning_risk", "dibuat_pada");
    await removeColumnIfExists("mr_planning_risk", "ditolak_oleh");
    await removeColumnIfExists("mr_planning_risk", "disetujui_oleh");
    await removeColumnIfExists("mr_planning_risk", "diverifikasi_oleh");
    await removeColumnIfExists("mr_planning_risk", "dibuat_oleh");
    await removeColumnIfExists("mr_planning_risk", "alasan_revisi");
  },
};