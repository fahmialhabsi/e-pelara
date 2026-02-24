"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("renstra_tabel_program", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      program_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "renstra_program", // tabel relasi
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "indikator_renstra", // tabel relasi
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      baseline: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      target_tahun_1: Sequelize.FLOAT,
      target_tahun_2: Sequelize.FLOAT,
      target_tahun_3: Sequelize.FLOAT,
      target_tahun_4: Sequelize.FLOAT,
      target_tahun_5: Sequelize.FLOAT,
      target_tahun_6: Sequelize.FLOAT,
      pagu_tahun_1: Sequelize.FLOAT,
      pagu_tahun_2: Sequelize.FLOAT,
      pagu_tahun_3: Sequelize.FLOAT,
      pagu_tahun_4: Sequelize.FLOAT,
      pagu_tahun_5: Sequelize.FLOAT,
      pagu_tahun_6: Sequelize.FLOAT,
      lokasi: {
        type: Sequelize.STRING,
        allowNull: true,
      },
    });

    // 🚨 Tambahkan unique constraint untuk kombinasi program_id + indikator_id
    await queryInterface.addConstraint("renstra_tabel_program", {
      fields: ["program_id", "indikator_id"],
      type: "unique",
      name: "unique_program_indikator", // nama constraint custom
    });
  },

  async down(queryInterface, Sequelize) {
    // Hapus constraint dulu sebelum drop tabel
    await queryInterface.removeConstraint(
      "renstra_tabel_program",
      "unique_program_indikator"
    );
    await queryInterface.dropTable("renstra_tabel_program");
  },
};
