"use strict";

module.exports = {
  up: async (queryInterface) => {
    // Hapus semua data lama
    await queryInterface.bulkDelete("divisions", null, {});

    // Insert ulang dengan ID 1-5
    await queryInterface.bulkInsert(
      "divisions",
      [
        {
          id: 1,
          name: "SEKRETARIAT",
          description: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          name: "BIDANG DISTRIBUSI",
          description: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 3,
          name: "BIDANG KONSUMSI",
          description: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 4,
          name: "BIDANG KERAWANAN",
          description: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 5,
          name: "BALAI PENGAWAS",
          description: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );
  },

  down: async (queryInterface) => {
    // Hapus data seeded
    await queryInterface.bulkDelete("divisions", null, {});
  },
};
