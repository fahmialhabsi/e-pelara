"use strict";

async function hasColumn(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table);
  return !!desc[column];
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    const table = "renja_mismatch_result";

    if (!(await hasColumn(queryInterface, table, "suggested_route"))) {
      await queryInterface.addColumn(table, "suggested_route", {
        type: DataTypes.STRING(512),
        allowNull: true,
      });
    }
    if (!(await hasColumn(queryInterface, table, "suggested_anchor"))) {
      await queryInterface.addColumn(table, "suggested_anchor", {
        type: DataTypes.STRING(128),
        allowNull: true,
      });
    }
    if (!(await hasColumn(queryInterface, table, "section_key"))) {
      await queryInterface.addColumn(table, "section_key", {
        type: DataTypes.STRING(64),
        allowNull: true,
      });
    }
    if (!(await hasColumn(queryInterface, table, "row_key"))) {
      await queryInterface.addColumn(table, "row_key", {
        type: DataTypes.STRING(128),
        allowNull: true,
      });
    }
    if (!(await hasColumn(queryInterface, table, "editor_target"))) {
      await queryInterface.addColumn(table, "editor_target", {
        type: DataTypes.STRING(64),
        allowNull: true,
      });
    }
    if (!(await hasColumn(queryInterface, table, "hierarchy_trace"))) {
      await queryInterface.addColumn(table, "hierarchy_trace", {
        type: DataTypes.JSON,
        allowNull: true,
      });
    }
    if (!(await hasColumn(queryInterface, table, "expected_source_trace"))) {
      await queryInterface.addColumn(table, "expected_source_trace", {
        type: DataTypes.JSON,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = "renja_mismatch_result";
    await queryInterface.removeColumn(table, "expected_source_trace").catch(() => {});
    await queryInterface.removeColumn(table, "hierarchy_trace").catch(() => {});
    await queryInterface.removeColumn(table, "editor_target").catch(() => {});
    await queryInterface.removeColumn(table, "row_key").catch(() => {});
    await queryInterface.removeColumn(table, "section_key").catch(() => {});
    await queryInterface.removeColumn(table, "suggested_anchor").catch(() => {});
    await queryInterface.removeColumn(table, "suggested_route").catch(() => {});
  },
};
