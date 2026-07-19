'use strict';

module.exports = {
  async up(queryInterface) {
    const cols = ['text_bab1', 'text_bab2', 'text_bab3', 'text_bab4', 'text_bab5'];
    for (const col of cols) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`renja_dokumen\` MODIFY \`${col}\` MEDIUMTEXT NULL;`,
      );
    }
  },

  async down(queryInterface) {
    const cols = ['text_bab1', 'text_bab2', 'text_bab3', 'text_bab4', 'text_bab5'];
    for (const col of cols) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`renja_dokumen\` MODIFY \`${col}\` TEXT NULL;`,
      );
    }
  },
};
