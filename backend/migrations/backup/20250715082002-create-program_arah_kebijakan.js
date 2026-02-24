"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("program_arah_kebijakan", {
      program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "program",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      arah_kebijakan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "arah_kebijakan",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("program_arah_kebijakan");
  },
};
