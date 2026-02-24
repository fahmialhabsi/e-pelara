"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("strategi", "deskripsi", {
      type: Sequelize.STRING(500),
      allowNull: false,
    });

    await queryInterface.changeColumn("arah_kebijakan", "deskripsi", {
      type: Sequelize.STRING(500),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("strategi", "deskripsi", {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    await queryInterface.changeColumn("arah_kebijakan", "deskripsi", {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },
};
