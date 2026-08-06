'use strict';

/**
 * Perluasan Recall Data ke 5 laporan keuangan LK di luar LK Dispang: LRA, LAK,
 * LO, LPE, Neraca. Kelimanya sudah pakai pola snapshot+generate+kunci (lihat
 * services/lraService.js dkk, kolom `dikunci`) yang identik dengan pola
 * DPA->LK Dispang — cuma belum ada dirty-flag needs_recall. Additive murni.
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

    const TARGET_TABLES = [
      'lra_snapshot',
      'lak_snapshot',
      'lo_snapshot',
      'lpe_snapshot',
      'neraca_snapshot',
    ];

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
    const TARGET_TABLES = [
      'lra_snapshot',
      'lak_snapshot',
      'lo_snapshot',
      'lpe_snapshot',
      'neraca_snapshot',
    ];

    for (const table of TARGET_TABLES) {
      if (!has(table)) continue;
      const desc = await qi.describeTable(table).catch(() => null);
      if (desc?.needs_recall) await qi.removeColumn(table, 'needs_recall');
      if (desc?.recall_reason) await qi.removeColumn(table, 'recall_reason');
      if (desc?.last_recall_at) await qi.removeColumn(table, 'last_recall_at');
    }
  },
};
