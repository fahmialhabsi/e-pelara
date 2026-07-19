"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("renja_dokumen", "submitted_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("renja_dokumen", "submitted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("renja_dokumen", "reviewed_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("renja_dokumen", "reviewed_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("renja_dokumen", "submitted_by");
    await queryInterface.removeColumn("renja_dokumen", "submitted_at");
    await queryInterface.removeColumn("renja_dokumen", "reviewed_by");
    await queryInterface.removeColumn("renja_dokumen", "reviewed_at");
  },
};
