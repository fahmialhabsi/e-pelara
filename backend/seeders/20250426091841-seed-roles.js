"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("roles", [
      {
        name: "ADMIN",
        description: "Administrator Sistem",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "SUPERVISOR",
        description: "Pengawas atau Kepala Sub Bagian",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "STAFF",
        description: "Pejabat Fungsional",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("roles", null, {});
  },
};
