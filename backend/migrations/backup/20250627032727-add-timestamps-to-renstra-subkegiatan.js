"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("renstra_subkegiatan", "created_at", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });
    await queryInterface.addColumn("renstra_subkegiatan", "updated_at", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal(
        "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      ),
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("renstra_subkegiatan", "created_at");
    await queryInterface.removeColumn("renstra_subkegiatan", "updated_at");
  },
};
