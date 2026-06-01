'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const desc = await queryInterface.describeTable('rka').catch(() => null);
    if (!desc) {
      console.log('[migration] ⚠️  Tabel rka tidak ada, skip');
      return;
    }

    if (!desc.rincian_belanja) {
      await queryInterface.addColumn('rka', 'rincian_belanja', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Rincian anggaran belanja per kode rekening Permendagri 90',
      });
      console.log('[migration] ✅ Kolom rincian_belanja ditambahkan ke tabel rka');
    } else {
      console.log('[migration] ⏭️  Kolom rincian_belanja sudah ada di rka, skip');
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('rka', 'rincian_belanja').catch(() => {});
  },
};
