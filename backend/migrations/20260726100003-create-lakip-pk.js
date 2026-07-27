'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lakip_pk', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tahun: { type: Sequelize.INTEGER, allowNull: false },
      renstra_id: { type: Sequelize.INTEGER, allowNull: false },
      tanggal_ttd: { type: Sequelize.DATEONLY, allowNull: true },
      pihak_pertama_nama: { type: Sequelize.STRING(255), allowNull: true, defaultValue: 'Sherly Tjoanda Laos' },
      pihak_pertama_jabatan: { type: Sequelize.STRING(255), allowNull: true, defaultValue: 'Gubernur Maluku Utara' },
      pasal1_tujuan: { type: Sequelize.TEXT, allowNull: true },
      pasal3_evaluasi: { type: Sequelize.TEXT, allowNull: true },
      pasal4_konsekuensi: { type: Sequelize.TEXT, allowNull: true },
      pasal5_larangan: { type: Sequelize.TEXT, allowNull: true },
      pasal5_etika: { type: Sequelize.TEXT, allowNull: true },
      pasal6_penutup: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addConstraint('lakip_pk', {
      fields: ['tahun', 'renstra_id'],
      type: 'unique',
      name: 'uniq_lakip_pk_tahun_renstra',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('lakip_pk');
  },
};
