"use strict";

/**
 * Metadata audit apply migrasi ke transaksi (mapping_sub_kegiatan).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    if (!tables.map((x) => String(x).toLowerCase()).includes("mapping_sub_kegiatan")) {
      console.log("[migration] ⏭️  mapping_sub_kegiatan tidak ada");
      return;
    }

    const desc = await qi.describeTable("mapping_sub_kegiatan").catch(() => ({}));

    if (!desc.applied_at) {
      await qi.addColumn("mapping_sub_kegiatan", "applied_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!desc.applied_by) {
      await qi.addColumn("mapping_sub_kegiatan", "applied_by", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
    if (!desc.applied_count) {
      await qi.addColumn("mapping_sub_kegiatan", "applied_count", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    console.log("[migration] ✅ mapping_sub_kegiatan applied_*");
  },

  async down(queryInterface) {
    const qi = queryInterface;
    const desc = await qi.describeTable("mapping_sub_kegiatan").catch(() => null);
    if (!desc) return;
    for (const col of ["applied_count", "applied_by", "applied_at"]) {
      if (desc[col]) await qi.removeColumn("mapping_sub_kegiatan", col);
    }
  },
};
