'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rka_rincian_belanja', 'spesifikasi', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('rka_rincian_belanja', 'volume_hasil', {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });

    await queryInterface.addColumn('rka_rincian_belanja', 'koefisien_array', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('rka_rincian_belanja', 'koefisien_array');

    await queryInterface.removeColumn('rka_rincian_belanja', 'volume_hasil');

    await queryInterface.removeColumn('rka_rincian_belanja', 'spesifikasi');
  },
};
