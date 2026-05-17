"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // =========================
    // REFERENCE MASTER LINKAGE
    // =========================
    await queryInterface.addColumn("mr_planning_risk", "kategori_risiko_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "mr_reference_items",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "kategori_risiko",
    });

    await queryInterface.addColumn("mr_planning_risk", "sumber_risiko_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "mr_reference_items",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "sumber_risiko",
    });

    await queryInterface.addColumn("mr_planning_risk", "kemungkinan_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "mr_reference_items",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "kemungkinan",
    });

    await queryInterface.addColumn("mr_planning_risk", "dampak_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "mr_reference_items",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "dampak",
    });

    await queryInterface.addColumn("mr_planning_risk", "level_risiko_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "mr_reference_items",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "level_risiko",
    });

    await queryInterface.addColumn("mr_planning_risk", "selera_risiko_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "mr_reference_items",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "selera_risiko",
    });

    await queryInterface.addColumn("mr_planning_risk", "status_risiko_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "mr_reference_items",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "status_risiko",
    });

    // =========================
    // GOVERNANCE / SPIP CONTEXT
    // =========================
    await queryInterface.addColumn(
      "mr_planning_risk",
      "metode_pencapaian_tujuan_spip",
      {
        type: Sequelize.TEXT,
        allowNull: true,
        after: "status_risiko_ref_id",
      }
    );

    // =========================
    // RISK STATEMENT & CODE FLAGS
    // =========================
    await queryInterface.addColumn("mr_planning_risk", "risk_statement", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "metode_pencapaian_tujuan_spip",
    });

    await queryInterface.addColumn(
      "mr_planning_risk",
      "risk_code_auto_generated",
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: "risk_statement",
      }
    );

    await queryInterface.addColumn("mr_planning_risk", "is_priority_candidate", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "risk_code_auto_generated",
    });

    await queryInterface.addColumn("mr_planning_risk", "is_above_appetite", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "is_priority_candidate",
    });

    // =========================
    // MATRIX LINKAGE
    // =========================
    await queryInterface.addColumn("mr_planning_risk", "matrix_code", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "is_above_appetite",
    });

    await queryInterface.addColumn("mr_planning_risk", "matrix_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "mr_risk_matrix",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "matrix_code",
    });

    // =========================
    // AUDIT TEKNIS
    // =========================
    await queryInterface.addColumn("mr_planning_risk", "created_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "last_revised_by",
    });

    await queryInterface.addColumn("mr_planning_risk", "updated_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "created_by",
    });

    // =========================
    // INDEX
    // =========================
    await queryInterface.addIndex("mr_planning_risk", ["kategori_risiko_ref_id"], {
      name: "idx_mr_planning_risk_kategori_ref_id",
    });

    await queryInterface.addIndex("mr_planning_risk", ["sumber_risiko_ref_id"], {
      name: "idx_mr_planning_risk_sumber_ref_id",
    });

    await queryInterface.addIndex("mr_planning_risk", ["kemungkinan_ref_id"], {
      name: "idx_mr_planning_risk_kemungkinan_ref_id",
    });

    await queryInterface.addIndex("mr_planning_risk", ["dampak_ref_id"], {
      name: "idx_mr_planning_risk_dampak_ref_id",
    });

    await queryInterface.addIndex("mr_planning_risk", ["level_risiko_ref_id"], {
      name: "idx_mr_planning_risk_level_ref_id",
    });

    await queryInterface.addIndex("mr_planning_risk", ["selera_risiko_ref_id"], {
      name: "idx_mr_planning_risk_selera_ref_id",
    });

    await queryInterface.addIndex("mr_planning_risk", ["status_risiko_ref_id"], {
      name: "idx_mr_planning_risk_status_ref_id",
    });

    await queryInterface.addIndex("mr_planning_risk", ["matrix_id"], {
      name: "idx_mr_planning_risk_matrix_id",
    });

    await queryInterface.addIndex("mr_planning_risk", ["matrix_code"], {
      name: "idx_mr_planning_risk_matrix_code",
    });

    await queryInterface.addIndex("mr_planning_risk", ["is_priority_candidate"], {
      name: "idx_mr_planning_risk_priority_candidate",
    });

    await queryInterface.addIndex("mr_planning_risk", ["is_above_appetite"], {
      name: "idx_mr_planning_risk_above_appetite",
    });

    await queryInterface.addIndex(
      "mr_planning_risk",
      ["context_id", "is_priority_candidate", "is_above_appetite"],
      {
        name: "idx_mr_planning_risk_context_priority_appetite",
      }
    );
  },

  async down(queryInterface) {
    // =========================
    // REMOVE INDEX FIRST
    // =========================
    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_context_priority_appetite"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_above_appetite"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_priority_candidate"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_matrix_code"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_matrix_id"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_status_ref_id"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_selera_ref_id"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_level_ref_id"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_dampak_ref_id"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_kemungkinan_ref_id"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_sumber_ref_id"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_kategori_ref_id"
    );

    // =========================
    // REMOVE COLUMNS
    // =========================
    await queryInterface.removeColumn("mr_planning_risk", "updated_by");
    await queryInterface.removeColumn("mr_planning_risk", "created_by");

    await queryInterface.removeColumn("mr_planning_risk", "matrix_id");
    await queryInterface.removeColumn("mr_planning_risk", "matrix_code");

    await queryInterface.removeColumn("mr_planning_risk", "is_above_appetite");
    await queryInterface.removeColumn(
      "mr_planning_risk",
      "is_priority_candidate"
    );
    await queryInterface.removeColumn(
      "mr_planning_risk",
      "risk_code_auto_generated"
    );
    await queryInterface.removeColumn("mr_planning_risk", "risk_statement");

    await queryInterface.removeColumn(
      "mr_planning_risk",
      "metode_pencapaian_tujuan_spip"
    );

    await queryInterface.removeColumn("mr_planning_risk", "status_risiko_ref_id");
    await queryInterface.removeColumn("mr_planning_risk", "selera_risiko_ref_id");
    await queryInterface.removeColumn("mr_planning_risk", "level_risiko_ref_id");
    await queryInterface.removeColumn("mr_planning_risk", "dampak_ref_id");
    await queryInterface.removeColumn("mr_planning_risk", "kemungkinan_ref_id");
    await queryInterface.removeColumn("mr_planning_risk", "sumber_risiko_ref_id");
    await queryInterface.removeColumn(
      "mr_planning_risk",
      "kategori_risiko_ref_id"
    );
  },
};