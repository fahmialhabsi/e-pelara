module.exports = {
  async up(qi, Sequelize) {
    await qi.createTable("cascading_arah_kebijakan", {
      cascading_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cascading", key: "id" },
        onDelete: "CASCADE",
      },
      arah_kebijakan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "arah_kebijakan", key: "id" }, // <- perbaikan di sini
        onDelete: "CASCADE",
      },
    });
  },
  async down(qi) {
    await qi.dropTable("cascading_arah_kebijakan");
  },
};
