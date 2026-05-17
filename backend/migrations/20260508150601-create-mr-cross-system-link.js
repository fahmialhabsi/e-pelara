"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_cross_system_link", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      source_system: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      source_module: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      source_table: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      source_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      target_system: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      target_module: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      target_table: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      target_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      linked_spip_risk_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      linked_spip_rtp_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      linked_spip_monitoring_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      linked_spip_evidence_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      link_type: {
        type: Sequelize.ENUM(
          "risk_mapping",
          "rtp_mapping",
          "monitoring_mapping",
          "evidence_mapping",
          "approval_mapping",
          "snapshot_mapping",
          "dashboard_mapping"
        ),
        allowNull: false,
      },

      link_status: {
        type: Sequelize.ENUM(
          "draft",
          "active",
          "inactive",
          "archived",
          "broken"
        ),
        allowNull: false,
        defaultValue: "draft",
      },

      link_note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      is_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      verified_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      created_by: {
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
    });

    await queryInterface.addIndex(
      "mr_cross_system_link",
      ["source_system", "source_module"],
      {
        name: "idx_mr_cross_system_source",
      }
    );

    await queryInterface.addIndex(
      "mr_cross_system_link",
      ["source_table", "source_id"],
      {
        name: "idx_mr_cross_system_source_entity",
      }
    );

    await queryInterface.addIndex(
      "mr_cross_system_link",
      ["target_system", "target_module"],
      {
        name: "idx_mr_cross_system_target",
      }
    );

    await queryInterface.addIndex(
      "mr_cross_system_link",
      ["target_table", "target_id"],
      {
        name: "idx_mr_cross_system_target_entity",
      }
    );

    await queryInterface.addIndex(
      "mr_cross_system_link",
      ["link_type"],
      {
        name: "idx_mr_cross_system_link_type",
      }
    );

    await queryInterface.addIndex(
      "mr_cross_system_link",
      ["link_status"],
      {
        name: "idx_mr_cross_system_link_status",
      }
    );

    await queryInterface.addIndex(
      "mr_cross_system_link",
      ["is_verified"],
      {
        name: "idx_mr_cross_system_is_verified",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_cross_system_link");
  },
};