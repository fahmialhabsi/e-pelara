module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("prioritas_kepala_daerah", "sasaran_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Pastikan ini true agar bisa di-SET NULL
      references: {
        model: "sasaran",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("prioritas_kepala_daerah", "sasaran_id");
  },
};
