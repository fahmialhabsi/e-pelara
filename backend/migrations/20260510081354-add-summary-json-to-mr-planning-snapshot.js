"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_planning_snapshot";

    const columnExists = async (columnName) => {
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :tableName
          AND COLUMN_NAME = :columnName
        `,
        {
          replacements: {
            tableName,
            columnName,
          },
        }
      );

      return rows.length > 0;
    };

    if (!(await columnExists("warning_summary_json"))) {
      await queryInterface.addColumn(tableName, "warning_summary_json", {
        type: Sequelize.JSON,
        allowNull: true,
        after: "effectiveness_summary_json",
      });
    }

    if (!(await columnExists("deviation_summary_json"))) {
      await queryInterface.addColumn(tableName, "deviation_summary_json", {
        type: Sequelize.JSON,
        allowNull: true,
        after: "warning_summary_json",
      });
    }

    if (!(await columnExists("approval_summary_json"))) {
      await queryInterface.addColumn(tableName, "approval_summary_json", {
        type: Sequelize.JSON,
        allowNull: true,
        after: "deviation_summary_json",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableName = "mr_planning_snapshot";

    const columnExists = async (columnName) => {
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :tableName
          AND COLUMN_NAME = :columnName
        `,
        {
          replacements: {
            tableName,
            columnName,
          },
        }
      );

      return rows.length > 0;
    };

    if (await columnExists("approval_summary_json")) {
      await queryInterface.removeColumn(tableName, "approval_summary_json");
    }

    if (await columnExists("deviation_summary_json")) {
      await queryInterface.removeColumn(tableName, "deviation_summary_json");
    }

    if (await columnExists("warning_summary_json")) {
      await queryInterface.removeColumn(tableName, "warning_summary_json");
    }
  },
};