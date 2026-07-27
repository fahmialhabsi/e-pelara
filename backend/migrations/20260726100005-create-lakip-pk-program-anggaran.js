'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lakip_pk_program_anggaran', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      lakip_pk_id: { type: Sequelize.INTEGER, allowNull: false },
      nama_program: { type: Sequelize.TEXT, allowNull: false },
      jumlah_anggaran: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('lakip_pk_program_anggaran');
  },
};
