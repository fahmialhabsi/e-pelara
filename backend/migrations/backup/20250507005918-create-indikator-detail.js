"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("indikator_detail", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "indikator", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      jenis: {
        type: Sequelize.ENUM("Impact", "Outcome", "Output", "Process"),
        allowNull: false,
      },
      tolok_ukur: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      target_kinerja: {
        type: Sequelize.TEXT,
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
  // async down(queryInterface, Sequelize) {
  //   await queryInterface.dropTable("indikator_detail");
  //   await queryInterface.sequelize.query(
  //     `DROP TYPE IF EXISTS enum_indikator_detail_jenis;`
  //   );
  // },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("indikator_details");
    // ENUM drop diabaikan karena kamu pakai MariaDB
  },
};
