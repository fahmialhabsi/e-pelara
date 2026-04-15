"use strict";

/** Kolom is_test pada renja_dokumen — selaras dengan rkpd_dokumen untuk filter UI operasional. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const d = await queryInterface.describeTable("renja_dokumen").catch(() => null);
    if (!d || d.is_test) return;
    await queryInterface.addColumn("renja_dokumen", "is_test", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    const d = await queryInterface.describeTable("renja_dokumen").catch(() => null);
    if (d?.is_test) await queryInterface.removeColumn("renja_dokumen", "is_test");
  },
};
