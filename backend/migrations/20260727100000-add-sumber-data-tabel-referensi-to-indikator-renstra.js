'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('indikator_renstra', 'sumber_data', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('indikator_renstra', 'sumber_data_mode', {
      type: Sequelize.ENUM('teks', 'tabel'),
      allowNull: false,
      defaultValue: 'teks',
    });
    await queryInterface.addColumn('indikator_renstra', 'sumber_data_tabel', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('indikator_renstra', 'referensi', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('indikator_renstra', 'sumber_data_tabel');
    await queryInterface.removeColumn('indikator_renstra', 'referensi');
    await queryInterface.removeColumn('indikator_renstra', 'sumber_data_mode');
    await queryInterface.changeColumn('indikator_renstra', 'sumber_data', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
