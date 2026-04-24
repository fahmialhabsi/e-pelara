"use strict";

/**
 * Relasi perencanaan: RKPD → Renja (renja_id).
 * Renja: kolom perangkat_daerah (regulasi-ready metadata).
 * Backward compatible: renja_id nullable; Renja.rkpd_id legacy tetap ada.
 */

async function columnExists(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table);
  return Boolean(desc[column]);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, "renja", "perangkat_daerah"))) {
      await queryInterface.addColumn("renja", "perangkat_daerah", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    if (!(await columnExists(queryInterface, "rkpd", "renja_id"))) {
      await queryInterface.addColumn("rkpd", "renja_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "renja", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    try {
      await queryInterface.addIndex("rkpd", ["renja_id"], {
        name: "idx_rkpd_renja_id",
      });
    } catch (_e) {
      /* index may exist */
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex("rkpd", "idx_rkpd_renja_id");
    } catch (_e) {
      /* */
    }
    if (await columnExists(queryInterface, "rkpd", "renja_id")) {
      await queryInterface.removeColumn("rkpd", "renja_id");
    }
    if (await columnExists(queryInterface, "renja", "perangkat_daerah")) {
      await queryInterface.removeColumn("renja", "perangkat_daerah");
    }
  },
};
