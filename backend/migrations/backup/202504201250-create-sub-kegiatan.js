"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sub_kegiatan", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "kegiatan",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      nama_sub_kegiatan: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      kode_sub_kegiatan: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      anggaran_sub_kegiatan: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("sub_kegiatan");
  },
};
