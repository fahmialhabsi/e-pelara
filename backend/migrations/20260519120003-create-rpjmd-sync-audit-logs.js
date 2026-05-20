"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "rpjmd_sync_audit_logs",
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          job_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "rpjmd_sync_jobs",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          actor_user_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          actor_role: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          event_type: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          target_module: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: "RENSTRA",
          },
          rpjmd_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          renstra_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          payload_json: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          result_json: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          ip_address: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          user_agent: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction },
      );

      await queryInterface.addIndex("rpjmd_sync_audit_logs", ["job_id"], {
        name: "idx_rpjmd_sync_audit_logs_job",
        transaction,
      });

      await queryInterface.addIndex("rpjmd_sync_audit_logs", ["actor_user_id"], {
        name: "idx_rpjmd_sync_audit_logs_actor",
        transaction,
      });

      await queryInterface.addIndex("rpjmd_sync_audit_logs", ["event_type"], {
        name: "idx_rpjmd_sync_audit_logs_event",
        transaction,
      });

      await queryInterface.addIndex(
        "rpjmd_sync_audit_logs",
        ["target_module", "rpjmd_id", "renstra_id"],
        {
          name: "idx_rpjmd_sync_audit_logs_scope",
          transaction,
        },
      );

      await queryInterface.addIndex("rpjmd_sync_audit_logs", ["created_at"], {
        name: "idx_rpjmd_sync_audit_logs_created_at",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("rpjmd_sync_audit_logs", { transaction });
    });
  },
};
