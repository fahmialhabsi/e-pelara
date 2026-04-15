"use strict";

/** Riwayat perubahan field pada baris RKPD/Renja (audit + before/after dokumen). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("planning_line_item_change_log", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      entity_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        comment: "rkpd_item | renja_item",
      },
      entity_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      field_key: { type: Sequelize.STRING(64), allowNull: false },
      old_value: { type: Sequelize.TEXT, allowNull: true },
      new_value: { type: Sequelize.TEXT, allowNull: true },
      source: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "user",
        comment: "user | cascade_rkpd",
      },
      change_batch_id: {
        type: Sequelize.STRING(40),
        allowNull: true,
        comment: "UUID satu batch edit/cascade",
      },
      user_id: { type: Sequelize.INTEGER, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
    await queryInterface.addIndex("planning_line_item_change_log", ["entity_type", "entity_id"], {
      name: "plicl_entity_idx",
    });
    await queryInterface.addIndex("planning_line_item_change_log", ["change_batch_id"], {
      name: "plicl_batch_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("planning_line_item_change_log");
  },
};
