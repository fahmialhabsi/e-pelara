"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_snapshot", {
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

      periode_awal: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      periode_akhir: {
        type: Sequelize.DATEONLY,
        allowNull: true,
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

      total_risk: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_high_risk: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_medium_risk: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_low_risk: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_mitigated: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_unmitigated: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_overdue: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_warning: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_deviation: {
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

      snapshot_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      generated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      generated_at: {
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
    });

    await queryInterface.addIndex(
      "mr_planning_snapshot",
      ["periode_type", "periode_label"],
      {
        name: "idx_mr_snapshot_periode",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_snapshot",
      ["tahun"],
      {
        name: "idx_mr_snapshot_tahun",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_snapshot",
      ["renstra_id"],
      {
        name: "idx_mr_snapshot_renstra_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_snapshot",
      ["opd_id"],
      {
        name: "idx_mr_snapshot_opd_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_snapshot",
      ["generated_by"],
      {
        name: "idx_mr_snapshot_generated_by",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_snapshot",
      ["approved_by"],
      {
        name: "idx_mr_snapshot_approved_by",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_snapshot",
      ["is_locked"],
      {
        name: "idx_mr_snapshot_is_locked",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_snapshot");
  },
};