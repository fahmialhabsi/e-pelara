module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("misi", "jenis_dokumen", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("misi", "tahun", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("misi", "jenis_dokumen");
    await queryInterface.removeColumn("misi", "tahun");
  },
};
