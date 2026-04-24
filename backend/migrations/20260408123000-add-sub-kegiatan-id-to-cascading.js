"use strict";

/** Menambah relasi optional cascading → sub_kegiatan (setelah kegiatan). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const lower = tables.map((t) => String(t).toLowerCase());
    if (!lower.includes("cascading")) return;

    const desc = await queryInterface.describeTable("cascading");
    if (desc.sub_kegiatan_id) return;

    await queryInterface.addColumn("cascading", "sub_kegiatan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "sub_kegiatan", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    const desc = await queryInterface
      .describeTable("cascading")
      .catch(() => ({}));
    if (!desc.sub_kegiatan_id) return;
    await queryInterface.removeColumn("cascading", "sub_kegiatan_id");
  },
};
