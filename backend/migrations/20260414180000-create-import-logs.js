"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("import_logs", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      preview_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
        unique: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      periode_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "periode_rpjmds", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      jumlah_berhasil: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      jumlah_gagal: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
    await queryInterface.addIndex("import_logs", ["periode_id"], { name: "idx_import_logs_periode" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("import_logs");
  },
};
