"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "mr_planning_approval_monitoring",
      {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },

        mr_planning_risk_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },

        entity_type: {
          type: Sequelize.ENUM(
            "risk",
            "mitigation",
            "monitoring",
            "deviation",
            "snapshot",
            "dashboard_summary"
          ),
          allowNull: false,
        },

        entity_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },

        status_revisi: {
          type: Sequelize.ENUM(
            "draft",
            "verifikasi",
            "approved",
            "ditolak"
          ),
          allowNull: false,
          defaultValue: "draft",
        },

        current_step: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },

        submitted_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },

        submitted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },

        verified_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },

        verified_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },

        approved_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },

        approved_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },

        rejected_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },

        rejected_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },

        approval_note: {
          type: Sequelize.TEXT,
          allowNull: true,
        },

        approval_sequence: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },

        is_locked: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
      }
    );

    await queryInterface.addIndex(
      "mr_planning_approval_monitoring",
      ["mr_planning_risk_id"],
      {
        name: "idx_mr_approval_monitoring_risk_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_approval_monitoring",
      ["entity_type", "entity_id"],
      {
        name: "idx_mr_approval_monitoring_entity",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_approval_monitoring",
      ["status_revisi"],
      {
        name: "idx_mr_approval_monitoring_status",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_approval_monitoring",
      ["submitted_by"],
      {
        name: "idx_mr_approval_monitoring_submitted_by",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_approval_monitoring",
      ["verified_by"],
      {
        name: "idx_mr_approval_monitoring_verified_by",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_approval_monitoring",
      ["approved_by"],
      {
        name: "idx_mr_approval_monitoring_approved_by",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_approval_monitoring",
      ["rejected_by"],
      {
        name: "idx_mr_approval_monitoring_rejected_by",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable(
      "mr_planning_approval_monitoring"
    );
  },
};