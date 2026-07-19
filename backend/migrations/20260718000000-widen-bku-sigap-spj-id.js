'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`bku\` MODIFY \`sigap_spj_id\` VARCHAR(36) NULL COMMENT 'ID SPJ di SIGAP (UUID) — idempotency sync';`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`bku\` MODIFY \`sigap_spj_id\` INT NULL;`,
    );
  },
};
