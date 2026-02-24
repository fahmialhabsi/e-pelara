module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("indikatorprograms", "program_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: "program",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("indikatorprograms", "program_id");
  },
};
