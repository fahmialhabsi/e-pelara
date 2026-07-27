'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lakip_pk_output_sasaran', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      lakip_pk_id: { type: Sequelize.INTEGER, allowNull: false },
      indikator_renstra_id: { type: Sequelize.INTEGER, allowNull: false },
      output: { type: Sequelize.TEXT, allowNull: true },
      bukti_ukur: { type: Sequelize.TEXT, allowNull: true },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('lakip_pk_output_sasaran');
  },
};
