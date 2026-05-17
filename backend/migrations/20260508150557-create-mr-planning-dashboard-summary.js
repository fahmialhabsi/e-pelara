"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "mr_planning_dashboard_summary",
      {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },

        periode_type: {
          type: Sequelize.ENUM(
            "bulanan",
            "triwulan",
            "semester",
            "tahunan",
            "adhoc"
          ),
          allowNull: false,
        },

        periode_label: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },

        tahun: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },

        renstra_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },

        opd_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },

        risk_total: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        risk_high: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        risk_medium: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        risk_low: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        mitigation_total: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        mitigation_done: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        mitigation_overdue: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        deviation_total: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        warning_total: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        approval_pending: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        approval_approved: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        approval_rejected: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        summary_json: {
          type: Sequelize.JSON,
          allowNull: true,
        },

        last_sync_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },

        sync_status: {
          type: Sequelize.STRING(50),
          allowNull: true,
          defaultValue: "pending",
        },

        generated_by: {
          type: Sequelize.INTEGER,
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
      }
    );

    await queryInterface.addIndex(
      "mr_planning_dashboard_summary",
      ["periode_type", "periode_label"],
      {
        name: "idx_mr_dashboard_summary_periode",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_dashboard_summary",
      ["tahun"],
      {
        name: "idx_mr_dashboard_summary_tahun",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_dashboard_summary",
      ["renstra_id"],
      {
        name: "idx_mr_dashboard_summary_renstra_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_dashboard_summary",
      ["opd_id"],
      {
        name: "idx_mr_dashboard_summary_opd_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_dashboard_summary",
      ["sync_status"],
      {
        name: "idx_mr_dashboard_summary_sync_status",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_dashboard_summary",
      ["generated_by"],
      {
        name: "idx_mr_dashboard_summary_generated_by",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable(
      "mr_planning_dashboard_summary"
    );
  },
};