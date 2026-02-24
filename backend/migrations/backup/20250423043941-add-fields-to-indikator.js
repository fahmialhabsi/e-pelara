"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // relasi ke TUJUAN
    await queryInterface.addColumn("indikator", "tujuan_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "tujuan",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    // relasi ke MISI
    await queryInterface.addColumn("indikator", "misi_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "misi",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    // kolom baru sesuai permintaan
    await queryInterface.addColumn("indikator", "kode_indikator", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("indikator", "definisi_operasional", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("indikator", "metode_penghitungan", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("indikator", "baseline", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("indikator", "target_tiap_tahun", {
      type: Sequelize.JSON, // atau Sequelize.TEXT jika DB Anda belum mendukung JSON
      allowNull: true,
    });
    await queryInterface.addColumn("indikator", "sumber_data", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("indikator", "penanggung_jawab", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("indikator", "keterangan", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface /*, Sequelize*/) => {
    // Urutan kebalikan dari up()
    await queryInterface.removeColumn("indikator", "keterangan");
    await queryInterface.removeColumn("indikator", "penanggung_jawab");
    await queryInterface.removeColumn("indikator", "sumber_data");
    await queryInterface.removeColumn("indikator", "target_tiap_tahun");
    await queryInterface.removeColumn("indikator", "baseline");
    await queryInterface.removeColumn("indikator", "metode_penghitungan");
    await queryInterface.removeColumn("indikator", "definisi_operasional");
    await queryInterface.removeColumn("indikator", "kode_indikator");
    await queryInterface.removeColumn("indikator", "misi_id");
    await queryInterface.removeColumn("indikator", "tujuan_id");
  },
};
