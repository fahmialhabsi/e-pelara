"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("indikatortujuans", "created_at", {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });

    await queryInterface.addColumn("indikatortujuans", "updated_at", {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"), // MySQL only
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("indikatortujuans", "created_at");
    await queryInterface.removeColumn("indikatortujuans", "updated_at");
  },
};
