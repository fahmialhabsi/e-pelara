module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable("indikatorkegiatans");

    if (!table.tujuan_id) {
      await queryInterface.addColumn("indikatorkegiatans", "tujuan_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!table.sasaran_id) {
      await queryInterface.addColumn("indikatorkegiatans", "sasaran_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!table.program_id) {
      await queryInterface.addColumn("indikatorkegiatans", "program_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("indikatorkegiatans", "tujuan_id");
    await queryInterface.removeColumn("indikatorkegiatans", "sasaran_id");
    await queryInterface.removeColumn("indikatorkegiatans", "program_id");
  },
};
