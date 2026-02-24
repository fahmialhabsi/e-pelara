module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("indikatortujuans", "createdAt");
    await queryInterface.removeColumn("indikatortujuans", "updatedAt");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("indikatortujuans", "createdAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });
    await queryInterface.addColumn("indikatortujuans", "updatedAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });
  },
};
