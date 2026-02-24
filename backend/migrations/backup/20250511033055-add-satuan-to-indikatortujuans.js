module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("indikatortujuans", "satuan", {
      type: Sequelize.STRING,
      allowNull: true, // Sesuaikan dengan kebutuhan Anda
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("indikatortujuans", "satuan");
  },
};
