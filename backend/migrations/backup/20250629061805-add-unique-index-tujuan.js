"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addConstraint("tujuan", {
      fields: ["misi_id", "periode_id", "no_tujuan"],
      type: "unique",
      name: "unique_no_tujuan_per_misi_periode",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint(
      "tujuan",
      "unique_no_tujuan_per_misi_periode"
    );
  },
};
