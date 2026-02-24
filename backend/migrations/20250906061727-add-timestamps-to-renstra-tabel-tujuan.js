"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("renstra_tabel_tujuan", "created_at", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });
    await queryInterface.addColumn("renstra_tabel_tujuan", "updated_at", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal(
        "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      ),
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("renstra_tabel_tujuan", "created_at");
    await queryInterface.removeColumn("renstra_tabel_tujuan", "updated_at");
  },
};
