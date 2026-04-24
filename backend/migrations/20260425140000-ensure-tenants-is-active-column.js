"use strict";

/**
 * Perbaikan: migrasi 20260425130000 bisa melewatkan kolom `is_active` jika describeTable
 * mengembalikan null / anomali. Migrasi ini idempoten via INFORMATION_SCHEMA.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'tenants'
         AND COLUMN_NAME = 'is_active'`,
    );
    const cnt = Number(rows?.[0]?.cnt ?? rows?.[0]?.CNT ?? 0);
    if (cnt > 0) return;

    await queryInterface.addColumn("tenants", "is_active", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addIndex("tenants", ["is_active"], { name: "idx_tenants_is_active" }).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("tenants", "idx_tenants_is_active").catch(() => {});
    await queryInterface.removeColumn("tenants", "is_active").catch(() => {});
  },
};
