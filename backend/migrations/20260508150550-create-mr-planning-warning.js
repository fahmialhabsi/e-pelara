"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_warning", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_risk_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      warning_type: {
        type: Sequelize.ENUM(
          "risk_level",
          "deviation",
          "overdue",
          "approval_pending",
          "mitigation_pending",
          "monitoring_pending",
          "broken_chain",
          "duplicate_data",
          "cross_system"
        ),
        allowNull: false,
      },

      warning_level: {
        type: Sequelize.ENUM("low", "medium", "high", "critical"),
        allowNull: false,
        defaultValue: "low",
      },

      warning_message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      source_table: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      source_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      read_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      read_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    await queryInterface.addIndex("mr_planning_warning", ["mr_planning_risk_id"], {
      name: "idx_mr_warning_risk_id",
    });

    await queryInterface.addIndex("mr_planning_warning", ["warning_type"], {
      name: "idx_mr_warning_type",
    });

    await queryInterface.addIndex("mr_planning_warning", ["warning_level"], {
      name: "idx_mr_warning_level",
    });

    await queryInterface.addIndex("mr_planning_warning", ["is_read"], {
      name: "idx_mr_warning_is_read",
    });

    await queryInterface.addIndex("mr_planning_warning", ["source_table", "source_id"], {
      name: "idx_mr_warning_source",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_warning");
  },
};