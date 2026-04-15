"use strict";

/**
 * Pemisahan data uji vs operasional (is_test).
 * Narasi opsional per bab untuk dokumen Renja OPD resmi (boleh diisi via API/PUT).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const addCol = async (table, column, def) => {
      const qi = queryInterface;
      const desc = await qi.describeTable(table).catch(() => null);
      if (!desc) {
        console.warn(`[migration] skip ${table} — tabel tidak ada`);
        return;
      }
      if (desc[column]) {
        console.log(`[migration] ⏭️  ${table}.${column} sudah ada`);
        return;
      }
      await qi.addColumn(table, column, def);
      console.log(`[migration] ✅ ${table}.${column}`);
    };

    await addCol("perangkat_daerah", "is_test", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await addCol("renstra_pd_dokumen", "is_test", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await addCol("rkpd_dokumen", "is_test", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await addCol("renja_dokumen", "text_bab1", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await addCol("renja_dokumen", "text_bab2", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await addCol("renja_dokumen", "text_bab5", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    const drop = async (table, column) => {
      const desc = await queryInterface.describeTable(table).catch(() => null);
      if (desc && desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };
    await drop("perangkat_daerah", "is_test");
    await drop("renstra_pd_dokumen", "is_test");
    await drop("rkpd_dokumen", "is_test");
    await drop("renja_dokumen", "text_bab1");
    await drop("renja_dokumen", "text_bab2");
    await drop("renja_dokumen", "text_bab5");
  },
};
