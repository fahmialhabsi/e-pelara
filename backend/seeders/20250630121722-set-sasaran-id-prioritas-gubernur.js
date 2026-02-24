"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const mapping = [
      { id: 1, sasaran_id: 88 },
      { id: 2, sasaran_id: 88 },
      { id: 3, sasaran_id: 88 },
      { id: 4, sasaran_id: 89 },
      { id: 5, sasaran_id: 89 },
      { id: 6, sasaran_id: 91 },
      { id: 7, sasaran_id: 91 },
      { id: 8, sasaran_id: 91 },
      { id: 9, sasaran_id: 92 },
      { id: 10, sasaran_id: 92 },
      { id: 11, sasaran_id: 93 },
      { id: 12, sasaran_id: 93 },
      { id: 13, sasaran_id: 94 },
      { id: 14, sasaran_id: 95 },
      { id: 15, sasaran_id: 98 },
      { id: 16, sasaran_id: 101 },
      { id: 17, sasaran_id: 99 },
      { id: 18, sasaran_id: 99 },
      { id: 19, sasaran_id: 101 },
      { id: 20, sasaran_id: 102 },
      { id: 21, sasaran_id: 102 },
      { id: 22, sasaran_id: 102 },
    ];

    for (const entry of mapping) {
      await queryInterface.bulkUpdate(
        "prioritas_kepala_daerah",
        { sasaran_id: entry.sasaran_id },
        { id: entry.id }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate(
      "prioritas_kepala_daerah",
      { sasaran_id: null },
      {
        id: {
          [Sequelize.Op.in]: Array.from({ length: 22 }, (_, i) => i + 1),
        },
      }
    );
  },
};
