"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("renstra_kegiatan", {
      fields: ["program_id", "rpjmd_kegiatan_id", "renstra_id"],
      unique: true,
      name: "uniq_renstra_kegiatan_chain",
    });

    await queryInterface.addIndex("renstra_subkegiatan", {
      fields: ["renstra_program_id", "kegiatan_id", "sub_kegiatan_id"],
      unique: true,
      name: "uniq_renstra_subkegiatan_chain",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "renstra_kegiatan",
      "uniq_renstra_kegiatan_chain"
    );

    await queryInterface.removeIndex(
      "renstra_subkegiatan",
      "uniq_renstra_subkegiatan_chain"
    );
  },
};