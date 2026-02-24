"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Menambahkan field yang baru
    await queryInterface.addColumn("opd_penanggung_jawab", "kegiatan_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Sesuaikan dengan kebijakan nullability yang diinginkan
    });

    await queryInterface.addColumn("opd_penanggung_jawab", "sub_kegiatan_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Sesuaikan dengan kebijakan nullability yang diinginkan
    });

    await queryInterface.addColumn("opd_penanggung_jawab", "tujuan_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Sesuaikan dengan kebijakan nullability yang diinginkan
    });

    await queryInterface.addColumn("opd_penanggung_jawab", "sasaran_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Sesuaikan dengan kebijakan nullability yang diinginkan
    });

    await queryInterface.addColumn("opd_penanggung_jawab", "program_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Sesuaikan dengan kebijakan nullability yang diinginkan
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Jika migrasi dibatalkan, kembalikan perubahan seperti semula
    await queryInterface.removeColumn("opd_penanggung_jawab", "kegiatan_id");
    await queryInterface.removeColumn(
      "opd_penanggung_jawab",
      "sub_kegiatan_id"
    );
    await queryInterface.removeColumn("opd_penanggung_jawab", "tujuan_id");
    await queryInterface.removeColumn("opd_penanggung_jawab", "sasaran_id");
    await queryInterface.removeColumn("opd_penanggung_jawab", "program_id");

    // Menambahkan kembali field opd_id
    await queryInterface.addColumn("opd_penanggung_jawab", "opd_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Sesuaikan dengan pengaturan awal Anda
    });
  },
};
