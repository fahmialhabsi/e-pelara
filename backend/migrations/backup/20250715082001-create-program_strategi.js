"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("program_strategi", {
      program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "program",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      strategi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "strategi",
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
    await queryInterface.dropTable("program_strategi");
  },
};
