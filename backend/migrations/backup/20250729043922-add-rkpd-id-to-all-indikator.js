"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const addColumnIfNotExists = async (table, column) => {
      const tableInfo = await queryInterface.describeTable(table);
      if (!tableInfo[column]) {
        await queryInterface.addColumn(table, column, {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "rkpd", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        });
        console.log(`✅ Kolom '${column}' ditambahkan ke '${table}'`);
      } else {
        console.log(`ℹ️ Kolom '${column}' sudah ada di '${table}', dilewati`);
      }
    };

    await Promise.all([
      addColumnIfNotExists("indikatortujuans", "rkpd_id"),
      addColumnIfNotExists("indikatorsasarans", "rkpd_id"),
      addColumnIfNotExists("indikatorprograms", "rkpd_id"),
      addColumnIfNotExists("indikatorkegiatans", "rkpd_id"),
    ]);
  },

  down: async (queryInterface) => {
    await Promise.all([
      queryInterface.removeColumn("indikatortujuans", "rkpd_id"),
      queryInterface.removeColumn("indikatorsasarans", "rkpd_id"),
      queryInterface.removeColumn("indikatorprograms", "rkpd_id"),
      queryInterface.removeColumn("indikatorkegiatans", "rkpd_id"),
    ]);
  },
};
