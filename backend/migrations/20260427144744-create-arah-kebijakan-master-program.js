"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("arah_kebijakan_master_program", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      arah_kebijakan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      master_program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      strategi_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      periode_id: {
        type: Sequelize.INTEGER,
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

    // unique constraint
    await queryInterface.addConstraint(
      "arah_kebijakan_master_program",
      {
        fields: ["arah_kebijakan_id", "master_program_id"],
        type: "unique",
        name: "uniq_arah_master_program",
      }
    );

    // index
    await queryInterface.addIndex(
      "arah_kebijakan_master_program",
      ["arah_kebijakan_id"],
      { name: "idx_akmp_arah" }
    );

    await queryInterface.addIndex(
      "arah_kebijakan_master_program",
      ["master_program_id"],
      { name: "idx_akmp_master_program" }
    );

    await queryInterface.addIndex(
      "arah_kebijakan_master_program",
      ["periode_id"],
      { name: "idx_akmp_periode" }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("arah_kebijakan_master_program");
  },
};