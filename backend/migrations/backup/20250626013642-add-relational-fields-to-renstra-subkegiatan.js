"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "renstra_subkegiatan",
      "renstra_program_id",
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "renstra_program",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      }
    );

    await queryInterface.addColumn("renstra_subkegiatan", "sub_kegiatan_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "sub_kegiatan",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      "renstra_subkegiatan",
      "renstra_program_id"
    );
    await queryInterface.removeColumn("renstra_subkegiatan", "sub_kegiatan_id");
  },
};
