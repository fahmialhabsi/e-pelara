'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('lakip_pk', 'target_serapan_anggaran', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('lakip_pk', 'target_tl_bpk', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('lakip_pk', 'target_ikm', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('lakip_pk', 'target_serapan_anggaran');
    await queryInterface.removeColumn('lakip_pk', 'target_tl_bpk');
    await queryInterface.removeColumn('lakip_pk', 'target_ikm');
  },
};
