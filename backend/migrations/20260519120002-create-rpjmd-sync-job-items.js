"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "rpjmd_sync_job_items",
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          job_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "rpjmd_sync_jobs",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          stage: {
            type: Sequelize.STRING(80),
            allowNull: false,
          },
          source_table: {
            type: Sequelize.STRING(120),
            allowNull: true,
          },
          source_ref_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          source_code: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          source_name: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          target_table: {
            type: Sequelize.STRING(120),
            allowNull: true,
          },
          target_ref_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          target_code: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          target_name: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          action: {
            type: Sequelize.STRING(80),
            allowNull: false,
            defaultValue: "no_action",
          },
          classification: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          severity: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: "info",
          },
          is_blocking: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          before_json: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          after_json: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          diff_json: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction },
      );

      await queryInterface.addIndex("rpjmd_sync_job_items", ["job_id"], {
        name: "idx_rpjmd_sync_job_items_job",
        transaction,
      });

      await queryInterface.addIndex(
        "rpjmd_sync_job_items",
        ["stage", "source_ref_id"],
        {
          name: "idx_rpjmd_sync_job_items_stage_source",
          transaction,
        },
      );

      await queryInterface.addIndex(
        "rpjmd_sync_job_items",
        ["classification", "severity"],
        {
          name: "idx_rpjmd_sync_job_items_classification",
          transaction,
        },
      );

      await queryInterface.addIndex("rpjmd_sync_job_items", ["is_blocking"], {
        name: "idx_rpjmd_sync_job_items_blocking",
        transaction,
      });

      await queryInterface.addIndex(
        "rpjmd_sync_job_items",
        ["target_table", "target_ref_id"],
        {
          name: "idx_rpjmd_sync_job_items_target",
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("rpjmd_sync_job_items", { transaction });
    });
  },
};
