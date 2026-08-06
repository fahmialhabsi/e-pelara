'use strict';

/**
 * Koreksi: kolom needs_recall pass sebelumnya (20260802120000) dipasang di
 * tabel `renstra` (model canonical `Renstra`, TERNYATA 0 baris terpakai di
 * data nyata). Struktur Program/Kegiatan/SubKegiatan Renstra yang benar-benar
 * dipakai (renstra_program/renstra_kegiatan/renstra_subkegiatan) bergantung
 * ke `renstra_opd` (model `RenstraOPD`, lihat renstra_kegiatanModel.js
 * `belongsTo(RenstraOPD, {foreignKey:"renstra_id"})`). Tambahkan di sini juga
 * supaya flag RPJMD->Renstra bisa mendarat di tempat yang benar.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    const has = (name) => tables.map((t) => String(t).toLowerCase()).includes(name);
    if (!has('renstra_opd')) {
      console.log('[migration] ⏭️  tabel renstra_opd tidak ada');
      return;
    }

    const desc = await qi.describeTable('renstra_opd').catch(() => null);
    const addColIfMissing = async (column, def) => {
      if (desc && desc[column]) {
        console.log(`[migration] ⏭️  renstra_opd.${column} sudah ada`);
        return;
      }
      await qi.addColumn('renstra_opd', column, def);
      console.log(`[migration] ✅ renstra_opd.${column}`);
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
    if (!tables.map((t) => String(t).toLowerCase()).includes('renstra_opd')) return;
    const desc = await qi.describeTable('renstra_opd').catch(() => null);
    if (desc?.needs_recall) await qi.removeColumn('renstra_opd', 'needs_recall');
    if (desc?.recall_reason) await qi.removeColumn('renstra_opd', 'recall_reason');
    if (desc?.last_recall_at) await qi.removeColumn('renstra_opd', 'last_recall_at');
  },
};
