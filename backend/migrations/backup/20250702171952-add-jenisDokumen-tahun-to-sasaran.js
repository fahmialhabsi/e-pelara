module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("sasaran", "jenisDokumen", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "rpjmd", // atau null jika dibolehkan
    });
    await queryInterface.addColumn("sasaran", "tahun", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "2025",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("sasaran", "jenisDokumen");
    await queryInterface.removeColumn("sasaran", "tahun");
  },
};
