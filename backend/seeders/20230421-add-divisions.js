"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert(
      "divisions",
      [
        { name: "SEKRETARIAT", created_at: new Date(), updated_at: new Date() },
        {
          name: "BIDANG DISTRIBUSI",
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: "BIDANG KONSUMSI",
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: "BIDANG KERAWANAN",
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: "BALAI PENGAWAS",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("divisions", null, {});
  },
};
