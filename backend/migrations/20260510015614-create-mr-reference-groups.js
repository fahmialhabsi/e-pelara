"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_reference_groups", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      kode_group: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      nama_group: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      domain: {
        type: Sequelize.ENUM(
          "risk",
          "context",
          "analysis",
          "mitigation",
          "monitoring",
          "reporting",
          "spip_linkage"
        ),
        allowNull: false,
        defaultValue: "risk",
      },

      is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      urutan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      metadata_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      updated_by: {
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

    await queryInterface.addIndex("mr_reference_groups", ["kode_group"], {
      unique: true,
      name: "idx_mr_reference_groups_kode_group_unique",
    });

    await queryInterface.addIndex("mr_reference_groups", ["domain"], {
      name: "idx_mr_reference_groups_domain",
    });

    await queryInterface.addIndex("mr_reference_groups", ["is_active"], {
      name: "idx_mr_reference_groups_is_active",
    });

    await queryInterface.addIndex("mr_reference_groups", ["is_system"], {
      name: "idx_mr_reference_groups_is_system",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_reference_groups");
  },
};