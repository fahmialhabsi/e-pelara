module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("misi", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("misi", "periode_id");
  },
};
