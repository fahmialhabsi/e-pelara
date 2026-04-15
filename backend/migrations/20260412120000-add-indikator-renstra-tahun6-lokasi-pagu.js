"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "indikator_renstra";

    const tryAdd = async (name, def) => {
      try {
        await queryInterface.addColumn(table, name, def);
      } catch (e) {
        if (!String(e?.message || "").includes("Duplicate column")) throw e;
      }
    };

    await tryAdd("target_tahun_6", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await tryAdd("lokasi", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    for (let i = 1; i <= 6; i++) {
      await tryAdd(`pagu_tahun_${i}`, {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = "indikator_renstra";
    const cols = [
      "target_tahun_6",
      "lokasi",
      ...[1, 2, 3, 4, 5, 6].map((i) => `pagu_tahun_${i}`),
    ];
    for (const c of cols) {
      try {
        await queryInterface.removeColumn(table, c);
      } catch {
        /* */
      }
    }
  },
};
