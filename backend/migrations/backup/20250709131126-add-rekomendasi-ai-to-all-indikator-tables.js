"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableNames = [
      "indikatorsasarans",
      "indikatorprograms",
      "indikatorkegiatans",
    ];

    for (const table of tableNames) {
      const tableDesc = await queryInterface.describeTable(table);

      if (!tableDesc.rekomendasi_ai) {
        await queryInterface.addColumn(table, "rekomendasi_ai", {
          type: Sequelize.TEXT,
          allowNull: true,
        });
      }
    }
  },

  down: async (queryInterface) => {
    const tableNames = [
      "indikatorsasarans",
      "indikatorprograms",
      "indikatorkegiatans",
    ];

    for (const table of tableNames) {
      await queryInterface.removeColumn(table, "rekomendasi_ai");
    }
  },
};
