"use strict";

/**
 * Hardening audit trail:
 * memastikan tabel activity_logs tersedia agar CREATE/UPDATE/DELETE/STATUS_CHANGE
 * di modul planning selalu bisa dicatat.
 */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = new Set(tables.map((t) => String(t).toLowerCase()));
  return normalized.has(String(tableName).toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, "activity_logs")) return;

    await queryInterface.createTable("activity_logs", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      old_data: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      new_data: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface
      .addIndex("activity_logs", ["entity_type", "entity_id", "created_at"], {
        name: "idx_activity_logs_entity_time",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface
      .removeIndex("activity_logs", "idx_activity_logs_entity_time")
      .catch(() => {});
    await queryInterface.dropTable("activity_logs").catch(() => {});
  },
};

