"use strict";

/** Token reset password sekali pakai (disimpan apa adanya; berlaku singkat). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "password_reset_token", {
      type: Sequelize.STRING(128),
      allowNull: true,
    });
    await queryInterface.addColumn("users", "password_reset_expires", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "password_reset_expires");
    await queryInterface.removeColumn("users", "password_reset_token");
  },
};
