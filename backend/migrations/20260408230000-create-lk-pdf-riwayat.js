"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("lk_pdf_riwayat", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      filename: { type: Sequelize.STRING(255), allowNull: false },
      filepath: { type: Sequelize.STRING(512), allowNull: false },
      size_bytes: { type: Sequelize.INTEGER, allowNull: true },
      user_id: { type: Sequelize.INTEGER, allowNull: true },
      username: { type: Sequelize.STRING(128), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("lk_pdf_riwayat", ["tahun_anggaran"]);
    await queryInterface.addIndex("lk_pdf_riwayat", ["created_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("lk_pdf_riwayat");
  },
};
