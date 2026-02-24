// migrations/20250519174631-create-program-arah-kebijakan.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("program_arah_kebijakan", {
      program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "program",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      arah_kebijakan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "arah_kebijakan",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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

    // (Opsional) Composite PK:
    await queryInterface.addConstraint("program_arah_kebijakan", {
      fields: ["program_id", "arah_kebijakan_id"],
      type: "primary key",
      name: "pk_program_arah_kebijakan",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("program_arah_kebijakan");
  },
};
