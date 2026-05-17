"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_context_stakeholder", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_context_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_planning_context",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      nama_pemangku_kepentingan: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      jenis_pemangku_kepentingan_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      jenis_pemangku_kepentingan: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      peran: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      kebutuhan_harapan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      pengaruh: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      kepentingan: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      strategi_komunikasi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      keterangan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      urutan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex(
      "mr_planning_context_stakeholder",
      ["mr_planning_context_id"],
      {
        name: "idx_mr_planning_context_stakeholder_context_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_context_stakeholder",
      ["jenis_pemangku_kepentingan_ref_id"],
      {
        name: "idx_mr_planning_context_stakeholder_jenis_ref_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_context_stakeholder",
      ["nama_pemangku_kepentingan"],
      {
        name: "idx_mr_planning_context_stakeholder_nama",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_context_stakeholder",
      ["mr_planning_context_id", "nama_pemangku_kepentingan"],
      {
        name: "idx_mr_planning_context_stakeholder_context_nama",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_context_stakeholder",
      ["is_active"],
      {
        name: "idx_mr_planning_context_stakeholder_is_active",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_context_stakeholder");
  },
};