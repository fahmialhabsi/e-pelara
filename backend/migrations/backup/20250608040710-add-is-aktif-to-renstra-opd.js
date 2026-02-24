"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("renstra_opd", "is_aktif", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("renstra_opd", "is_aktif");
  },
};
