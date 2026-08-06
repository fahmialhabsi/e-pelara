'use strict';

/**
 * Kolom dirty-flag "perlu recall" — generalisasi pola yang sudah ada di
 * `renja_dokumen` (needs_recall/recall_reason/last_recall_at, lihat
 * models/renjaDokumenModel.js) ke tabel dokumen modul lain, supaya
 * backend/services/recallDataService.js bisa menandai baris ini otomatis
 * ketika data hulu (master nomenklatur, RPJMD, Renstra, RKA, BKU/Penatausahaan,
 * DPA) berubah. Additive murni — tidak mengubah kolom yang sudah ada.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    const has = (name) => tables.map((t) => String(t).toLowerCase()).includes(name);

    const addColIfMissing = async (table, column, def) => {
      if (!has(table)) {
        console.log(`[migration] ⏭️  tabel ${table} tidak ada`);
        return;
      }
      const desc = await qi.describeTable(table).catch(() => null);
      if (desc && desc[column]) {
        console.log(`[migration] ⏭️  ${table}.${column} sudah ada`);
        return;
      }
      await qi.addColumn(table, column, def);
      console.log(`[migration] ✅ ${table}.${column}`);
    };

    const TARGET_TABLES = ['rkpd_dokumen', 'renstra', 'rka', 'dpa', 'lk_dispang', 'lakip'];

    for (const table of TARGET_TABLES) {
      await addColIfMissing(table, 'needs_recall', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await addColIfMissing(table, 'recall_reason', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      await addColIfMissing(table, 'last_recall_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    const has = (name) => tables.map((t) => String(t).toLowerCase()).includes(name);
    const TARGET_TABLES = ['rkpd_dokumen', 'renstra', 'rka', 'dpa', 'lk_dispang', 'lakip'];

    for (const table of TARGET_TABLES) {
      if (!has(table)) continue;
      const desc = await qi.describeTable(table).catch(() => null);
      if (desc?.needs_recall) await qi.removeColumn(table, 'needs_recall');
      if (desc?.recall_reason) await qi.removeColumn(table, 'recall_reason');
      if (desc?.last_recall_at) await qi.removeColumn(table, 'last_recall_at');
    }
  },
};
