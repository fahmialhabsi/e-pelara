"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("program", "jenisDokumen", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("program", "tahun", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("sub_kegiatan", "jenisDokumen", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("sub_kegiatan", "tahun", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("program", "jenisDokumen");
    await queryInterface.removeColumn("program", "tahun");

    await queryInterface.removeColumn("sub_kegiatan", "jenisDokumen");
    await queryInterface.removeColumn("sub_kegiatan", "tahun");
  },
};
