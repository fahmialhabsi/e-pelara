"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Tabel yang akan ditambahkan kolom
    const tables = ["visi", "misi"];

    for (const table of tables) {
      // Mengecek struktur tabel
      const tableDesc = await queryInterface.describeTable(table);

      if (!tableDesc.rpjmd_id) {
        await queryInterface.addColumn(table, "rpjmd_id", {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "rpjmd",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = ["visi", "misi"];

    for (const table of tables) {
      const tableDesc = await queryInterface.describeTable(table);

      if (tableDesc.rpjmd_id) {
        await queryInterface.removeColumn(table, "rpjmd_id");
      }
    }
  },
};
