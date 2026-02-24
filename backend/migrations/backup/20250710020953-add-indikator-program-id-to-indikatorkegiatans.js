module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Tambah kolom indikator_program_id tanpa constraint dulu
    await queryInterface.addColumn(
      "indikatorkegiatans",
      "indikator_program_id",
      {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true, // Penting! Biar migrasi berhasil
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      "indikatorkegiatans",
      "indikator_program_id"
    );
  },
};
