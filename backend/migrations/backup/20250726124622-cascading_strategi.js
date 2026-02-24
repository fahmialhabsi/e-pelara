module.exports = {
  async up(qi, Sequelize) {
    await qi.createTable("cascading_strategi", {
      cascading_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cascading", key: "id" },
        onDelete: "CASCADE",
      },
      strategi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "strategi", key: "id" }, // ✅ perbaikan di sini
        onDelete: "CASCADE",
      },
    });
  },
  async down(qi) {
    await qi.dropTable("cascading_strategi");
  },
};
