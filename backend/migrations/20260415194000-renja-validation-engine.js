"use strict";

async function tableExists(queryInterface, tableName) {
  const rows = await queryInterface.showAllTables();
  const names = (rows || []).map((r) =>
    String(typeof r === "string" ? r : Array.isArray(r) ? r[0] : Object.values(r)[0]),
  );
  return names.some((x) => x.toLowerCase() === tableName.toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    if (!(await tableExists(queryInterface, "renja_validation_run"))) {
      await queryInterface.createTable("renja_validation_run", {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        renja_dokumen_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "renja_dokumen", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        run_type: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "full" },
        blocking_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        warning_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        info_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        summary_json: { type: DataTypes.JSON, allowNull: true },
        computed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("renja_validation_run", ["renja_dokumen_id", "computed_at"], {
        name: "idx_renja_validation_run_doc_time",
      });
    }

    if (!(await tableExists(queryInterface, "renja_mismatch_result"))) {
      await queryInterface.createTable("renja_mismatch_result", {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        renja_validation_run_id: {
          type: DataTypes.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: "renja_validation_run", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        renja_dokumen_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "renja_dokumen", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        renja_item_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "renja_item", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        mismatch_scope: { type: DataTypes.STRING(16), allowNull: false },
        source_type: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "INTERNAL" },
        mismatch_code: { type: DataTypes.STRING(64), allowNull: false },
        mismatch_label: { type: DataTypes.STRING(255), allowNull: true },
        severity: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "warning" },
        message: { type: DataTypes.TEXT, allowNull: false },
        recommendation: { type: DataTypes.TEXT, allowNull: true },
        field_name: { type: DataTypes.STRING(64), allowNull: true },
        source_reference_type: { type: DataTypes.STRING(32), allowNull: true },
        source_reference_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
        expected_value: { type: DataTypes.TEXT, allowNull: true },
        actual_value: { type: DataTypes.TEXT, allowNull: true },
        is_blocking: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        is_resolved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        resolved_by: { type: DataTypes.INTEGER, allowNull: true },
        resolved_at: { type: DataTypes.DATE, allowNull: true },
        computed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("renja_mismatch_result", ["renja_dokumen_id", "severity", "is_blocking"], {
        name: "idx_renja_mismatch_doc_severity",
      });
      await queryInterface.addIndex("renja_mismatch_result", ["renja_item_id"], {
        name: "idx_renja_mismatch_item",
      });
      await queryInterface.addIndex("renja_mismatch_result", ["mismatch_code"], {
        name: "idx_renja_mismatch_code",
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("renja_mismatch_result").catch(() => {});
    await queryInterface.dropTable("renja_validation_run").catch(() => {});
  },
};
