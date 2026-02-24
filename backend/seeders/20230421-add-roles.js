"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert(
      "roles",
      [
        { name: "SUPER ADMIN", createdAt: new Date(), updatedAt: new Date() },
        { name: "ADMINISTRATOR", createdAt: new Date(), updatedAt: new Date() },
        { name: "PENGAWAS", createdAt: new Date(), updatedAt: new Date() },
        { name: "PELAKSANA", createdAt: new Date(), updatedAt: new Date() },
      ],
      {}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("roles", null, {});
  },
};
