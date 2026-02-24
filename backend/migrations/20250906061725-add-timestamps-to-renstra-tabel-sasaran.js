"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("renstra_tabel_sasaran", "created_at", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });

    await queryInterface.addColumn("renstra_tabel_sasaran", "updated_at", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal(
        "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      ),
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("renstra_tabel_sasaran", "created_at");
    await queryInterface.removeColumn("renstra_tabel_sasaran", "updated_at");
  },
};
