'use strict';

/**
 * Perluasan Recall Data ke MR Planning Risk: `escalateToRisk()`
 * (services/mr/mrPlanningTemuanService.js) menyalin nama_risiko/uraian_risiko/
 * penyebab_risiko/dampak_risiko dari Temuan SATU KALI saat eskalasi. Kalau
 * Temuan yang sudah dieskalasi direvisi lagi lewat createRevisionFromApprovedTemuan(),
 * Risk hasil eskalasi tidak pernah ikut diperbarui. Additive murni.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    if (!tables.map((t) => String(t).toLowerCase()).includes('mr_planning_risk')) {
      console.log('[migration] ⏭️  tabel mr_planning_risk tidak ada');
      return;
    }

    const desc = await qi.describeTable('mr_planning_risk').catch(() => null);
    const addColIfMissing = async (column, def) => {
      if (desc && desc[column]) {
        console.log(`[migration] ⏭️  mr_planning_risk.${column} sudah ada`);
        return;
      }
      await qi.addColumn('mr_planning_risk', column, def);
      console.log(`[migration] ✅ mr_planning_risk.${column}`);
    };

    await addColIfMissing('needs_recall', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await addColIfMissing('recall_reason', { type: Sequelize.STRING(255), allowNull: true });
    await addColIfMissing('last_recall_at', { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    if (!tables.map((t) => String(t).toLowerCase()).includes('mr_planning_risk')) return;
    const desc = await qi.describeTable('mr_planning_risk').catch(() => null);
    if (desc?.needs_recall) await qi.removeColumn('mr_planning_risk', 'needs_recall');
    if (desc?.recall_reason) await qi.removeColumn('mr_planning_risk', 'recall_reason');
    if (desc?.last_recall_at) await qi.removeColumn('mr_planning_risk', 'last_recall_at');
  },
};
