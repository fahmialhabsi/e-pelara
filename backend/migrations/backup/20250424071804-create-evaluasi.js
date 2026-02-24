"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("evaluasi", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      realisasi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "realisasi_indikator", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM("Tercapai", "Tidak Tercapai"),
        allowNull: false,
      },
      catatan: {
        type: Sequelize.TEXT,
      },
      rekomendasi: {
        type: Sequelize.TEXT,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("evaluasi");
    // Jika ingin menghapus enum di Postgres:
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_evaluasi_status;"
    );
  },
};
