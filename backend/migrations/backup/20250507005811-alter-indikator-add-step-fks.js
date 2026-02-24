"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("indikator", "program_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "program", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("indikator", "kegiatan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "kegiatan", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("indikator", "stage", {
      type: Sequelize.ENUM("misi", "tujuan", "sasaran", "program", "kegiatan"),
      allowNull: false,
      defaultValue: "misi",
    });
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn("indikator", "program_id");
    } catch (error) {
      console.warn("Kolom program_id tidak ditemukan:", error.message);
    }

    try {
      await queryInterface.removeColumn("indikator", "kegiatan_id");
    } catch (error) {
      console.warn("Kolom kegiatan_id tidak ditemukan:", error.message);
    }

    try {
      await queryInterface.removeColumn("indikator", "stage");
    } catch (error) {
      console.warn("Kolom stage tidak ditemukan:", error.message);
    }

    // ENUM untuk stage tidak perlu di-drop jika kamu pakai MariaDB,
    // karena ENUM bukan tipe custom seperti di PostgreSQL.
    // Tapi jika kamu pakai Postgres, kamu bisa uncomment baris ini:
    // try {
    //   await queryInterface.sequelize.query(
    //     `DROP TYPE IF EXISTS enum_indikator_stage;`
    //   );
    // } catch (error) {
    //   console.warn("ENUM type enum_indikator_stage tidak bisa dihapus:", error.message);
    // }
  },
};
