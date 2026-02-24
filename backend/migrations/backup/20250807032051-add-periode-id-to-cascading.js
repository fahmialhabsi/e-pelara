"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("cascading", "periode_id", {
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

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("cascading", "periode_id");
  },
};
