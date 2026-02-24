"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("renstra_sasaran", "kebijakan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "tujuan_id",
    });

    await queryInterface.addColumn("renstra_sasaran", "strategi_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "kebijakan_id",
    });

    await queryInterface.addColumn("renstra_sasaran", "program_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "strategi_id",
    });

    await queryInterface.addColumn("renstra_sasaran", "kegiatan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "program_id",
    });

    await queryInterface.addColumn("renstra_sasaran", "subkegiatan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "kegiatan_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("renstra_sasaran", "subkegiatan_id");
    await queryInterface.removeColumn("renstra_sasaran", "kegiatan_id");
    await queryInterface.removeColumn("renstra_sasaran", "program_id");
    await queryInterface.removeColumn("renstra_sasaran", "strategi_id");
    await queryInterface.removeColumn("renstra_sasaran", "kebijakan_id");
  },
};
