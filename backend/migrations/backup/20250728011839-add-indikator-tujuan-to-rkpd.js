"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("rkpd", "indikator_tujuan_id", {
      type: Sequelize.INTEGER,
      references: {
        model: "indikatortujuans",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("rkpd", "indikator_tujuan_id");
  },
};
