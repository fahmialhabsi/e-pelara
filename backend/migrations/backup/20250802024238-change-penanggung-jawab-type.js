"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ubah kolom menjadi UNSIGNED agar match dengan opd_penanggung_jawab.id
    await queryInterface.changeColumn(
      "indikatorkegiatans",
      "penanggung_jawab",
      {
        type: Sequelize.INTEGER,
        allowNull: true, // atau false jika wajib
      }
    );

    // Tambahkan foreign key constraint
    await queryInterface.addConstraint("indikatorkegiatans", {
      fields: ["penanggung_jawab"],
      type: "foreign key",
      name: "fk_indikatorkegiatans_penanggung_jawab",
      references: {
        table: "opd_penanggung_jawab",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // atau CASCADE, tergantung kebutuhan
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      "indikatorkegiatans",
      "fk_indikatorkegiatans_penanggung_jawab"
    );

    await queryInterface.changeColumn(
      "indikatorkegiatans",
      "penanggung_jawab",
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
  },
};
