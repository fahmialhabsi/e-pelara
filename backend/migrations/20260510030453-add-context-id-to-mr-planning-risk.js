"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("mr_planning_risk", "context_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "mr_planning_context",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("mr_planning_risk", ["context_id"], {
      name: "idx_mr_planning_risk_context_id",
    });

    await queryInterface.addIndex(
      "mr_planning_risk",
      ["context_id", "renstra_id", "indikator_id", "stage", "ref_id"],
      {
        name: "idx_mr_planning_risk_context_scope",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_context_scope"
    );

    await queryInterface.removeIndex(
      "mr_planning_risk",
      "idx_mr_planning_risk_context_id"
    );

    await queryInterface.removeColumn("mr_planning_risk", "context_id");
  },
};