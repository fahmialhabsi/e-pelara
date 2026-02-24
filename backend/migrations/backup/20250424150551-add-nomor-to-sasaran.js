module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("sasaran", "nomor", {
      type: Sequelize.INTEGER,
      allowNull: true, // Bisa diisi nanti
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("sasaran", "nomor");
  },
};
