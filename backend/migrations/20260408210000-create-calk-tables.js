"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("calk_template", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      bab: { type: Sequelize.INTEGER, allowNull: false, comment: "1-6" },
      sub_bab: { type: Sequelize.STRING(10), allowNull: true },
      judul: { type: Sequelize.STRING(255), allowNull: false },
      konten_default: { type: Sequelize.TEXT("long"), allowNull: true },
      tipe: {
        type: Sequelize.ENUM("TEKS", "TABEL_AUTO", "TABEL_MANUAL", "CAMPURAN"),
        allowNull: false,
      },
      sumber_data: { type: Sequelize.STRING(100), allowNull: true },
      urutan: { type: Sequelize.INTEGER, allowNull: false },
      wajib: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("calk_konten", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      template_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "calk_template", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      konten: { type: Sequelize.TEXT("long"), allowNull: true },
      data_otomatis: { type: Sequelize.JSON, allowNull: true },
      variabel: { type: Sequelize.JSON, allowNull: true },
      status: {
        type: Sequelize.ENUM("DRAFT", "FINAL"),
        defaultValue: "DRAFT",
      },
      terakhir_diedit: { type: Sequelize.DATE, allowNull: true },
      diedit_oleh: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("calk_konten", {
      fields: ["tahun_anggaran", "template_id"],
      type: "unique",
      name: "unique_calk_konten_per_tahun_template",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("calk_konten");
    await queryInterface.dropTable("calk_template");
  },
};
