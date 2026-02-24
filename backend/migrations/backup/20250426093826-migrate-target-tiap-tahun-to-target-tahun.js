"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ambil semua data dari tabel indikators
    const [indikators] = await queryInterface.sequelize.query(
      `SELECT id, target_tiap_tahun FROM indikator WHERE target_tiap_tahun IS NOT NULL`
    );

    // Loop data satu per satu
    for (const item of indikators) {
      let parsedTargets = {};

      if (typeof item.target_tiap_tahun === "string") {
        try {
          parsedTargets = JSON.parse(item.target_tiap_tahun);
        } catch (error) {
          console.error(
            `Gagal parsing target_tiap_tahun untuk indikator id ${item.id}:`,
            error
          );
          continue; // Skip kalau datanya error
        }
      } else if (
        typeof item.target_tiap_tahun === "object" &&
        item.target_tiap_tahun !== null
      ) {
        parsedTargets = item.target_tiap_tahun;
      }

      await queryInterface.bulkUpdate(
        "indikator",
        {
          target_tahun_1: parsedTargets["2025"] || 0,
          target_tahun_2: parsedTargets["2026"] || 0,
          target_tahun_3: parsedTargets["2027"] || 0,
          target_tahun_4: parsedTargets["2028"] || 0,
          target_tahun_5: parsedTargets["2029"] || 0,
        },
        {
          id: item.id,
        }
      );
    }

    // Setelah semua data dipindahkan, hapus kolom target_tiap_tahun
    await queryInterface.removeColumn("indikator", "target_tiap_tahun");
  },

  async down(queryInterface, Sequelize) {
    // Kalau rollback, tambahkan lagi kolom target_tiap_tahun
    await queryInterface.addColumn("indikator", "target_tiap_tahun", {
      type: Sequelize.JSON, // atau Sequelize.TEXT kalau sebelumnya TEXT
      allowNull: true,
    });
  },
};
