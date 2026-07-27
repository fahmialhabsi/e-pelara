'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ikm_penilaian', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      renstra_id: { type: Sequelize.INTEGER, allowNull: false },
      tahun: { type: Sequelize.INTEGER, allowNull: false },
      periode: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'tahunan' },
      skor: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      sumber_survei: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ikm_penilaian');
  },
};
