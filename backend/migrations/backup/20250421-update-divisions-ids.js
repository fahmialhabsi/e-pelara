"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Gunakan transaction untuk atomicity
    await queryInterface.sequelize.transaction(async (t) => {
      // Nonaktifkan cek FK
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0;", {
        transaction: t,
      });

      // Update referensi di tabel users
      await queryInterface.sequelize.query(
        "UPDATE `users` SET `divisions_id` = `divisions_id` - 5 WHERE `divisions_id` BETWEEN 6 AND 10;",
        { transaction: t }
      );

      // Update primary key di tabel divisions
      await queryInterface.sequelize.query(
        "UPDATE `divisions` SET `id` = `id` - 5 WHERE `id` BETWEEN 6 AND 10;",
        { transaction: t }
      );

      // Reset AUTO_INCREMENT ke 6 (karena max sekarang 5)
      await queryInterface.sequelize.query(
        "ALTER TABLE `divisions` AUTO_INCREMENT = 6;",
        { transaction: t }
      );

      // Aktifkan kembali cek FK
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1;", {
        transaction: t,
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert: kembalikan id 1-5 ke 6-10 dan update users
    await queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0;", {
        transaction: t,
      });
      await queryInterface.sequelize.query(
        "UPDATE `users` SET `divisions_id` = `divisions_id` + 5 WHERE `divisions_id` BETWEEN 1 AND 5;",
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        "UPDATE `divisions` SET `id` = `id` + 5 WHERE `id` BETWEEN 1 AND 5;",
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE `divisions` AUTO_INCREMENT = 11;",
        { transaction: t }
      );
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1;", {
        transaction: t,
      });
    });
  },
};
