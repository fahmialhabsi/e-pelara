'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('renja', 'opd_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'rkpd_id',
    });

    await queryInterface.addColumn('renja', 'opd_penanggung_jawab', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'opd_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('renja', 'opd_penanggung_jawab');
    await queryInterface.removeColumn('renja', 'opd_id');
  },
};
