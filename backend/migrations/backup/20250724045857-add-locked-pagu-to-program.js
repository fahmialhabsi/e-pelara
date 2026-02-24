module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn("program", "locked_pagu", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn("program", "locked_pagu");
  },
};
