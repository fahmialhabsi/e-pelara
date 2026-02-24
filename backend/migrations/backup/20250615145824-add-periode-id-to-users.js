"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // sementara true untuk menghindari error jika sudah ada data
      references: {
        model: "periode_rpjmds",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "periode_id");
  },
};
