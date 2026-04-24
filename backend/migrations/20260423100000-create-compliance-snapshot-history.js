"use strict";

/** Histori snapshot compliance SubKegiatan (dashboard trend + audit point-in-time). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { BIGINT, INTEGER, JSON, DATE } = Sequelize;

    await queryInterface.createTable("compliance_snapshot_history", {
      id: {
        type: BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      captured_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      snapshot: {
        type: JSON,
        allowNull: false,
      },
      recorded_by: {
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

    await queryInterface.addIndex("compliance_snapshot_history", ["captured_at"], {
      name: "idx_compliance_snapshot_history_captured_at",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("compliance_snapshot_history");
  },
};
