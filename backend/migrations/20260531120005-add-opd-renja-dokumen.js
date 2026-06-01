'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const desc = await queryInterface.describeTable('renja_dokumen').catch(() => null);

    if (!desc) {
      console.log('[migration] ⚠️  Tabel renja_dokumen tidak ada, skip');
      return;
    }

    if (!desc.opd_id) {
      await queryInterface.addColumn('renja_dokumen', 'opd_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });

      console.log('[migration] ✅ Kolom opd_id ditambahkan ke renja_dokumen');
    } else {
      console.log('[migration] ⏭️  Kolom opd_id sudah ada, skip');
    }

    if (!desc.opd_penanggung_jawab) {
      await queryInterface.addColumn('renja_dokumen', 'opd_penanggung_jawab', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });

      console.log('[migration] ✅ Kolom opd_penanggung_jawab ditambahkan ke renja_dokumen');
    } else {
      console.log('[migration] ⏭️  Kolom opd_penanggung_jawab sudah ada, skip');
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('renja_dokumen', 'opd_penanggung_jawab').catch(() => {});
    await queryInterface.removeColumn('renja_dokumen', 'opd_id').catch(() => {});
  },
};
