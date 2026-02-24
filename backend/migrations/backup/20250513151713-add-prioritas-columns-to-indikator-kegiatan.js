module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "indikatorkegiatans",
      "prioritas_nasional_id",
      {
        type: Sequelize.BIGINT.UNSIGNED, // Ubah tipe data menjadi BIGINT UNSIGNED
        allowNull: true,
        references: {
          model: "prioritas_nasional", // nama tabel referensi
          key: "id", // kolom referensi yang sesuai
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }
    );

    await queryInterface.addColumn(
      "indikatorkegiatans",
      "prioritas_daerah_id",
      {
        type: Sequelize.BIGINT.UNSIGNED, // Ubah tipe data menjadi BIGINT UNSIGNED
        allowNull: true,
        references: {
          model: "prioritas_daerah", // nama tabel referensi
          key: "id", // kolom referensi yang sesuai
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }
    );

    await queryInterface.addColumn(
      "indikatorkegiatans",
      "prioritas_gubernur_id",
      {
        type: Sequelize.BIGINT.UNSIGNED, // Ubah tipe data menjadi BIGINT UNSIGNED
        allowNull: true,
        references: {
          model: "prioritas_kepala_daerah", // nama tabel referensi
          key: "id", // kolom referensi yang sesuai
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
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
};
