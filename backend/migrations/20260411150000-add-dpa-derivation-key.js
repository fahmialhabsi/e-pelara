"use strict";

/**
 * Idempotensi DPA dari RKA: satu derivation_key per (rka_id, jenis_dokumen derivasi).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable("dpa").catch(() => null);
    if (!desc) return;
    if (!desc.derivation_key) {
      await queryInterface.addColumn("dpa", "derivation_key", {
        type: Sequelize.STRING(48),
        allowNull: true,
      });
    }
    try {
      await queryInterface.addIndex("dpa", ["derivation_key"], {
        unique: true,
        name: "dpa_derivation_key_unique",
      });
    } catch (e) {
      if (!String(e?.message || e).includes("Duplicate")) throw e;
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex("dpa", "dpa_derivation_key_unique");
    } catch (_) {}
    const desc = await queryInterface.describeTable("dpa").catch(() => null);
    if (desc?.derivation_key) {
      await queryInterface.removeColumn("dpa", "derivation_key");
    }
  },
};
