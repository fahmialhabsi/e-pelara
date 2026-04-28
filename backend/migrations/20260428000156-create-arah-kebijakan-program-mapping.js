"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("arah_kebijakan_program_mapping", {
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

      periode_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      jenis_dokumen: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      dataset_key: {
        type: Sequelize.STRING,
        allowNull: false, // ✅ penting
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // FK
    await queryInterface.addConstraint("arah_kebijakan_program_mapping", {
      fields: ["arah_kebijakan_id"],
      type: "foreign key",
      name: "fk_mapping_arah_kebijakan",
      references: {
        table: "arah_kebijakan",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("arah_kebijakan_program_mapping", {
      fields: ["master_program_id"],
      type: "foreign key",
      name: "fk_mapping_master_program",
      references: {
        table: "master_program",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // UNIQUE
    await queryInterface.addConstraint(
      "arah_kebijakan_program_mapping",
      {
        fields: ["arah_kebijakan_id", "master_program_id", "dataset_key"],
        type: "unique",
        name: "unique_ak_mp_dataset",
      }
    );

    // INDEX
    await queryInterface.addIndex(
      "arah_kebijakan_program_mapping",
      ["arah_kebijakan_id"]
    );

    await queryInterface.addIndex(
      "arah_kebijakan_program_mapping",
      ["master_program_id"]
    );

    await queryInterface.addIndex(
      "arah_kebijakan_program_mapping",
      ["dataset_key"]
    );

    await queryInterface.addIndex(
      "arah_kebijakan_program_mapping",
      ["arah_kebijakan_id", "dataset_key"]
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("arah_kebijakan_program_mapping");
  },
};