"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "rpjmd_sync_jobs",
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          job_code: {
            type: Sequelize.STRING(120),
            allowNull: false,
          },
          rpjmd_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          renstra_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          target_module: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: "RENSTRA",
          },
          scope: {
            type: Sequelize.STRING(80),
            allowNull: false,
            defaultValue: "all",
          },
          mode: {
            type: Sequelize.STRING(50),
            allowNull: false,
          },
          status: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: "draft",
          },
          requested_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          confirmed_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          reason: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          summary_json: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          error_message: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          started_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          finished_at: {
            type: Sequelize.DATE,
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

      await queryInterface.addIndex("rpjmd_sync_jobs", ["job_code"], {
        name: "idx_rpjmd_sync_jobs_job_code",
        unique: true,
        transaction,
      });

      await queryInterface.addIndex(
        "rpjmd_sync_jobs",
        ["rpjmd_id", "renstra_id", "target_module"],
        {
          name: "idx_rpjmd_sync_jobs_scope",
          transaction,
        },
      );

      await queryInterface.addIndex("rpjmd_sync_jobs", ["mode", "status"], {
        name: "idx_rpjmd_sync_jobs_mode_status",
        transaction,
      });

      await queryInterface.addIndex("rpjmd_sync_jobs", ["requested_by"], {
        name: "idx_rpjmd_sync_jobs_requested_by",
        transaction,
      });

      await queryInterface.addIndex("rpjmd_sync_jobs", ["created_at"], {
        name: "idx_rpjmd_sync_jobs_created_at",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("rpjmd_sync_jobs", { transaction });
    });
  },
};
