module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("indikatorkegiatans", "misi_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("indikatorkegiatans", "misi_id");
  },
};
