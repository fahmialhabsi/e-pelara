module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("indikatortujuans", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("indikatorsasarans", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("indikatorprograms", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("indikatorkegiatans", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("indikator", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("indikatortujuans", "periode_id");
    await queryInterface.removeColumn("indikatorsasarans", "periode_id");
    await queryInterface.removeColumn("indikatorprograms", "periode_id");
    await queryInterface.removeColumn("indikatorkegiatans", "periode_id");
    await queryInterface.removeColumn("indikator", "periode_id");
  },
};
