"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("indikatorsasarans", "indikator_id", {
      type: Sequelize.STRING(50),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    const [results] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS invalid FROM indikatorsasarans WHERE indikator_id NOT REGEXP '^[0-9]+$'`
    );

    if (results[0].invalid === 0) {
      await queryInterface.changeColumn("indikatorsasarans", "indikator_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      });
    } else {
      console.warn(
        "⚠️ Kolom indikator_id mengandung data non-numeric. Rollback dibatalkan untuk menghindari error."
      );
    }
  },
};
