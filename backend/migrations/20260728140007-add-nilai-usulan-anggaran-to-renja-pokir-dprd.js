'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('renja_pokir_dprd', 'nilai_usulan_anggaran', {
      type: Sequelize.DECIMAL(18, 2),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('renja_pokir_dprd', 'nilai_usulan_anggaran');
  },
};
