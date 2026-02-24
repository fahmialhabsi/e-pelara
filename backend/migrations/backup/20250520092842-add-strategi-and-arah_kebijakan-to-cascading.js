"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tambah kolom strategi_id
    await queryInterface.addColumn("cascading", "strategi_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "strategi", // nama tabel strategi
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Tambah kolom arah_kebijakan_id
    await queryInterface.addColumn("cascading", "arah_kebijakan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "arah_kebijakan", // nama tabel arah_kebijakan
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("cascading", "arah_kebijakan_id");
    await queryInterface.removeColumn("cascading", "strategi_id");
  },
};
