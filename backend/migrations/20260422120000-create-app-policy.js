"use strict";

/** Kebijakan aplikasi key-value (mis. mode operasional). Additive, tanpa mengubah transaksi. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, DATE } = Sequelize;

    await queryInterface.createTable("app_policy", {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      policy_key: {
        type: STRING(128),
        allowNull: false,
        unique: true,
      },
      policy_value: {
        type: STRING(512),
        allowNull: false,
      },
      description: { type: TEXT, allowNull: true },
      is_active: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      updated_by: {
        type: INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    const now = new Date();
    await queryInterface.bulkInsert("app_policy", [
      {
        policy_key: "operational_mode",
        policy_value: "LEGACY",
        description:
          "Mode operasional: LEGACY | TRANSITION | MASTER. Default LEGACY hingga admin mengubah.",
        is_active: true,
        updated_by: null,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("app_policy");
  },
};
