"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // FK ke periode_rpjmds
    await queryInterface.addConstraint("rkpd", {
      fields: ["periode_id"],
      type: "foreign key",
      name: "fk_rkpd_periode_id", // nama constraint
      references: {
        table: "periode_rpjmds",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    // FK ke renstra_program
    await queryInterface.addConstraint("rkpd", {
      fields: ["renstra_program_id"],
      type: "foreign key",
      name: "fk_rkpd_renstra_program_id",
      references: {
        table: "renstra_program",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    // Hapus FK dalam urutan terbalik dari pembuatan
    await queryInterface.removeConstraint("rkpd", "fk_rkpd_renstra_program_id");
    await queryInterface.removeConstraint("rkpd", "fk_rkpd_periode_id");
  },
};
