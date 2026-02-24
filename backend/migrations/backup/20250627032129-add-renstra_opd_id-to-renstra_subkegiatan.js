"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("renstra_subkegiatan", "renstra_opd_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "renstra_opd", // Nama tabel referensi di database
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("renstra_subkegiatan", "renstra_opd_id");
  },
};
