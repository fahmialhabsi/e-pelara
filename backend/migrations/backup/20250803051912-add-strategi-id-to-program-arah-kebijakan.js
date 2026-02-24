module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("program_arah_kebijakan", "strategi_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "strategi", // pastikan ini sesuai nama tabel strategi di DB kamu
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("program_arah_kebijakan", "strategi_id");
  },
};
