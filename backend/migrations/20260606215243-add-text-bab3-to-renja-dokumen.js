'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('renja_dokumen', 'text_bab3', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'text_bab2',
    });
    await queryInterface.addColumn('renja_dokumen', 'text_bab4', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'text_bab3',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('renja_dokumen', 'text_bab3');
    await queryInterface.removeColumn('renja_dokumen', 'text_bab4');
  },
};
