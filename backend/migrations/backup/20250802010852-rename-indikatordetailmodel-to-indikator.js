module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("indikatordetailmodel", "indikator");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("indikator", "indikatordetailmodel");
  },
};
