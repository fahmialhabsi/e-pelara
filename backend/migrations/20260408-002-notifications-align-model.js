"use strict";

/**
 * Align `notifications` table with Notification model + legacy db_epelara.sql.
 * Legacy columns: userId, type, message, read, timestamp, createdAt, updatedAt
 * Adds (if missing): title, entity_type, entity_id, link
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("notifications");

    if (!table.title) {
      await queryInterface.addColumn("notifications", "title", {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null,
      });
    }
    if (!table.entity_type) {
      await queryInterface.addColumn("notifications", "entity_type", {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null,
      });
    }
    if (!table.entity_id) {
      await queryInterface.addColumn("notifications", "entity_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
    }
    if (!table.link) {
      await queryInterface.addColumn("notifications", "link", {
        type: Sequelize.STRING(500),
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("notifications");
    if (table.link) await queryInterface.removeColumn("notifications", "link");
    if (table.entity_id) await queryInterface.removeColumn("notifications", "entity_id");
    if (table.entity_type) await queryInterface.removeColumn("notifications", "entity_type");
    if (table.title) await queryInterface.removeColumn("notifications", "title");
  },
};
