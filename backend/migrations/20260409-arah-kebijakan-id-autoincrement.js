"use strict";

/**
 * Perbaiki INSERT Arah Kebijakan: MySQL error ER_NO_DEFAULT_FOR_FIELD pada `id`
 * bila kolom `id` ada tapi tidak AUTO_INCREMENT.
 */
module.exports = {
  async up(queryInterface) {
    const qi = queryInterface.sequelize;
    const [[row]] = await qi.query(
      `SELECT COLUMN_TYPE, EXTRA, COLUMN_KEY
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'arah_kebijakan'
         AND COLUMN_NAME = 'id'`,
    );
    if (!row) return;

    const extra = (row.EXTRA || "").toLowerCase();
    if (extra.includes("auto_increment")) return;

    const colType = row.COLUMN_TYPE || "int";
    await qi.query(
      `ALTER TABLE \`arah_kebijakan\` MODIFY \`id\` ${colType} NOT NULL AUTO_INCREMENT`,
    );
  },

  async down(queryInterface) {
    // Menghapus AUTO_INCREMENT berisiko; biarkan kosong.
  },
};
