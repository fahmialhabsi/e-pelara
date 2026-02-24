"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("indikator", "level_dokumen", {
      type: Sequelize.ENUM("RPJMD", "RENSTRA", "RKPD", "RENJA", "RKA", "LAKIP"),
      allowNull: true,
      defaultValue: "RPJMD",
    });
    await queryInterface.addColumn("indikator", "jenis_iku", {
      type: Sequelize.ENUM("IKU", "IKP", "IKSK"),
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("indikator", "level_dokumen");
    await queryInterface.removeColumn("indikator", "jenis_iku");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_indikator_level_dokumen";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_indikator_jenis_iku";'
    );
  },
};
