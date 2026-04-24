"use strict";

async function hasColumn(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table);
  return !!desc[column];
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    const table = "renja_mismatch_result";

    if (!(await hasColumn(queryInterface, table, "threshold_context"))) {
      await queryInterface.addColumn(table, "threshold_context", {
        type: DataTypes.JSON,
        allowNull: true,
      });
    }
    if (!(await hasColumn(queryInterface, table, "hierarchy_level"))) {
      await queryInterface.addColumn(table, "hierarchy_level", {
        type: DataTypes.STRING(32),
        allowNull: true,
      });
    }
    if (!(await hasColumn(queryInterface, table, "document_pair"))) {
      await queryInterface.addColumn(table, "document_pair", {
        type: DataTypes.STRING(32),
        allowNull: true,
      });
    }

    await queryInterface
      .addIndex(table, ["renja_dokumen_id", "source_type", "document_pair"], {
        name: "idx_renja_mismatch_doc_source_pair",
      })
      .catch(() => {});
    await queryInterface
      .addIndex(table, ["renja_dokumen_id", "hierarchy_level"], {
        name: "idx_renja_mismatch_doc_level",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    const table = "renja_mismatch_result";
    await queryInterface.removeIndex(table, "idx_renja_mismatch_doc_level").catch(() => {});
    await queryInterface.removeIndex(table, "idx_renja_mismatch_doc_source_pair").catch(() => {});
    await queryInterface.removeColumn(table, "document_pair").catch(() => {});
    await queryInterface.removeColumn(table, "hierarchy_level").catch(() => {});
    await queryInterface.removeColumn(table, "threshold_context").catch(() => {});
  },
};
