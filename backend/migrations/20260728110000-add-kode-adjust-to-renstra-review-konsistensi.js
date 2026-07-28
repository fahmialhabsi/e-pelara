'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('renstra_review_konsistensi', 'sesuaikan_kode', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addColumn('renstra_review_konsistensi', 'kode_sebelum', {
      type: Sequelize.STRING(60),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('renstra_review_konsistensi', 'sesuaikan_kode');
    await queryInterface.removeColumn('renstra_review_konsistensi', 'kode_sebelum');
  },
};
