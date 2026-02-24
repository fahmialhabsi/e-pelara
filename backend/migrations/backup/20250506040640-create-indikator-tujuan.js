  module.exports = {
    up: async (queryInterface, Sequelize) => {
      await queryInterface.addColumn("tujuan", "indikator", {
        type: Sequelize.STRING, // Anda bisa mengganti tipe data sesuai kebutuhan
        allowNull: true, // Menyesuaikan apakah kolom ini boleh null atau tidak
      });
    },

    down: async (queryInterface, Sequelize) => {
      await queryInterface.removeColumn("tujuan", "indikator");
    },
  };
