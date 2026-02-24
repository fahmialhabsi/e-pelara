"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("users", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "periode_rpjmds",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("users", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "periode_rpjmds",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },
};
