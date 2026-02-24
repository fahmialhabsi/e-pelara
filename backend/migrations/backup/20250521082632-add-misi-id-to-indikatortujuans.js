/**
 * Migration to add `misi_id` and `tujuan_id` columns to `indikatortujuans` table
 */

"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("indikatortujuans", "misi_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "misi",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    await queryInterface.addColumn("indikatortujuans", "tujuan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "tujuan",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("indikatortujuans", "misi_id");
    await queryInterface.removeColumn("indikatortujuans", "tujuan_id");
  },
};
