"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // =========================
    // CONTEXT LINKAGE
    // =========================
    await queryInterface.addColumn("mr_planning_risk_history", "context_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "mr_planning_context",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "mr_planning_risk_id",
    });

    // =========================
    // ACTION TRACE
    // =========================
    await queryInterface.addColumn("mr_planning_risk_history", "action_type", {
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

    await queryInterface.addColumn("mr_planning_risk_history", "source_module", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "action_type",
    });

    // =========================
    // AUDIT LINKAGE
    // =========================
    await queryInterface.addColumn("mr_planning_risk_history", "audit_event_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "source_module",
    });

    // =========================
    // INDEX
    // =========================
    await queryInterface.addIndex("mr_planning_risk_history", ["context_id"], {
      name: "idx_mr_planning_risk_history_context_id",
    });

    await queryInterface.addIndex("mr_planning_risk_history", ["action_type"], {
      name: "idx_mr_planning_risk_history_action_type",
    });

    await queryInterface.addIndex("mr_planning_risk_history", ["source_module"], {
      name: "idx_mr_planning_risk_history_source_module",
    });

    await queryInterface.addIndex("mr_planning_risk_history", ["audit_event_id"], {
      name: "idx_mr_planning_risk_history_audit_event_id",
    });

    await queryInterface.addIndex(
      "mr_planning_risk_history",
      ["context_id", "mr_planning_risk_id", "status_revisi"],
      {
        name: "idx_mr_planning_risk_history_context_risk_status",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_history",
      ["mr_planning_risk_id", "action_type", "source_module"],
      {
        name: "idx_mr_planning_risk_history_risk_action_source",
      }
    );
  },

  async down(queryInterface) {
    // =========================
    // REMOVE INDEX FIRST
    // =========================
    await queryInterface.removeIndex(
      "mr_planning_risk_history",
      "idx_mr_planning_risk_history_risk_action_source"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk_history",
      "idx_mr_planning_risk_history_context_risk_status"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk_history",
      "idx_mr_planning_risk_history_audit_event_id"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk_history",
      "idx_mr_planning_risk_history_source_module"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk_history",
      "idx_mr_planning_risk_history_action_type"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk_history",
      "idx_mr_planning_risk_history_context_id"
    );

    // =========================
    // REMOVE COLUMNS
    // =========================
    await queryInterface.removeColumn("mr_planning_risk_history", "audit_event_id");
    await queryInterface.removeColumn("mr_planning_risk_history", "source_module");
    await queryInterface.removeColumn("mr_planning_risk_history", "action_type");
    await queryInterface.removeColumn("mr_planning_risk_history", "context_id");
  },
};