"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ubah kolom opd_penanggung_jawab ke INTEGER
    await queryInterface.changeColumn("kegiatan", "opd_penanggung_jawab", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Tambahkan foreign key
    await queryInterface.addConstraint("kegiatan", {
      fields: ["opd_penanggung_jawab"],
      type: "foreign key",
      name: "fk_opd_penanggung_jawab", // nama constraint
      references: {
        table: "opd_penanggung_jawab",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    // Hapus foreign key constraint
    await queryInterface.removeConstraint(
      "kegiatan",
      "fk_opd_penanggung_jawab"
    );

    // Ubah kembali ke VARCHAR (panjang bisa disesuaikan)
    await queryInterface.changeColumn("kegiatan", "opd_penanggung_jawab", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },
};
