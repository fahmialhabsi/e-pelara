module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("arah_kebijakan", "prioritas", {
      type: Sequelize.ENUM("Tinggi", "Sedang", "Rendah"),
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("arah_kebijakan", "prioritas", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
