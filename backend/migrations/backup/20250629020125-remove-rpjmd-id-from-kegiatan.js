"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("kegiatan", "rpjmd_id");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("kegiatan", "rpjmd_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "rpjmd", // sesuaikan nama tabel jika berbeda
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },
};
