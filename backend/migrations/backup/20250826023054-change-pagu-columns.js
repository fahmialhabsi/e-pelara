"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_1", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_2", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_3", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_4", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_5", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_6", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
    await queryInterface.changeColumn(
      "renstra_tabel_program",
      "pagu_akhir_renstra",
      {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    // Jika rollback, kembalikan ke DECIMAL(10,0) atau FLOAT sesuai kebutuhan sebelumnya
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_1", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_2", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_3", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_4", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_5", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.changeColumn("renstra_tabel_program", "pagu_tahun_6", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.changeColumn(
      "renstra_tabel_program",
      "pagu_akhir_renstra",
      {
        type: Sequelize.DECIMAL(10, 0),
        allowNull: true,
      }
    );
  },
};
