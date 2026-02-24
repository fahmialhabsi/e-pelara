"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addConstraint("program", {
      fields: ["periode_id", "kode_program"],
      type: "unique",
      name: "unique_kode_program_per_periode_constraint",
    });

    await queryInterface.addConstraint("program", {
      fields: ["periode_id", "nama_program"],
      type: "unique",
      name: "unique_nama_program_per_periode_constraint",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint(
      "program",
      "unique_kode_program_per_periode_constraint"
    );
    await queryInterface.removeConstraint(
      "program",
      "unique_nama_program_per_periode_constraint"
    );
  },
};
