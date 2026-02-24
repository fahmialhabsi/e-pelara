"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Hapus kolom prioritas yang tidak relevan
    await queryInterface.removeColumn(
      "indikatorkegiatans",
      "prioritas_nasional_id"
    );
    await queryInterface.removeColumn(
      "indikatorkegiatans",
      "prioritas_daerah_id"
    );
    await queryInterface.removeColumn(
      "indikatorkegiatans",
      "prioritas_gubernur_id"
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback: tambahkan kembali kolom (jika perlu)
    await queryInterface.addColumn(
      "indikatorkegiatans",
      "prioritas_nasional_id",
      {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: "prioritas_nasional", // sesuaikan nama tabel target
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }
    );
    await queryInterface.addColumn(
      "indikatorkegiatans",
      "prioritas_daerah_id",
      {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: "prioritas_daerah",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }
    );
    await queryInterface.addColumn(
      "indikatorkegiatans",
      "prioritas_gubernur_id",
      {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: "prioritas_kepala_daerah",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }
    );
  },
};
