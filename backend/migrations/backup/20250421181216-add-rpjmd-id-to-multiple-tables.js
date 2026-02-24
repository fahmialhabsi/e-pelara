"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = [
      "divisions",
      "indikator",
      "kegiatan",
      "misi",
      "opd_penanggung_jawab",
      "program",
      "sasaran",
      "sub_kegiatan",
      "tujuan",
      "visi",
    ];

    for (const table of tables) {
      await queryInterface.addColumn(table, "rpjmd_id", {
        type: Sequelize.INTEGER,
        allowNull: true, // sementara bisa null, nanti bisa diubah jadi false kalau data rpjmd sudah siap
        references: {
          model: "rpjmd",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = [
      "divisions",
      "indikator",
      "kegiatan",
      "misi",
      "opd_penanggung_jawab",
      "program",
      "sasaran",
      "sub_kegiatan",
      "tujuan",
      "visi",
    ];

    for (const table of tables) {
      await queryInterface.removeColumn(table, "rpjmd_id");
    }
  },
};
