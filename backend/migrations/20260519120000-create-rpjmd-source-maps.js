"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "rpjmd_source_maps",
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          rpjmd_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          renstra_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          target_module: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: "RENSTRA",
          },
          source_stage: {
            type: Sequelize.STRING(80),
            allowNull: false,
          },
          source_table: {
            type: Sequelize.STRING(120),
            allowNull: false,
          },
          source_ref_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          source_code: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          source_name: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          target_table: {
            type: Sequelize.STRING(120),
            allowNull: false,
          },
          target_ref_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          target_code: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          target_name: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          parent_source_stage: {
            type: Sequelize.STRING(80),
            allowNull: true,
          },
          parent_source_ref_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          parent_target_stage: {
            type: Sequelize.STRING(80),
            allowNull: true,
          },
          parent_target_ref_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          mapping_status: {
            type: Sequelize.STRING(80),
            allowNull: false,
            defaultValue: "missing_source_map",
          },
          chain_status: {
            type: Sequelize.STRING(80),
            allowNull: false,
            defaultValue: "unchecked",
          },
          source_hash: {
            type: Sequelize.STRING(128),
            allowNull: true,
          },
          target_hash: {
            type: Sequelize.STRING(128),
            allowNull: true,
          },
          last_synced_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          last_checked_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          created_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          updated_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction },
      );

      await queryInterface.addIndex(
        "rpjmd_source_maps",
        ["rpjmd_id", "target_module", "source_stage", "source_ref_id"],
        {
          name: "idx_rpjmd_source_maps_source",
          transaction,
        },
      );

      await queryInterface.addIndex(
        "rpjmd_source_maps",
        ["target_module", "target_table", "target_ref_id"],
        {
          name: "idx_rpjmd_source_maps_target",
          transaction,
        },
      );

      await queryInterface.addIndex(
        "rpjmd_source_maps",
        ["renstra_id", "source_stage", "source_ref_id"],
        {
          name: "idx_rpjmd_source_maps_renstra",
          transaction,
        },
      );

      await queryInterface.addIndex(
        "rpjmd_source_maps",
        ["mapping_status", "chain_status"],
        {
          name: "idx_rpjmd_source_maps_status",
          transaction,
        },
      );

      await queryInterface.addIndex(
        "rpjmd_source_maps",
        ["parent_source_stage", "parent_source_ref_id"],
        {
          name: "idx_rpjmd_source_maps_parent_source",
          transaction,
        },
      );

      await queryInterface.addIndex(
        "rpjmd_source_maps",
        ["parent_target_stage", "parent_target_ref_id"],
        {
          name: "idx_rpjmd_source_maps_parent_target",
          transaction,
        },
      );

      await queryInterface.addConstraint("rpjmd_source_maps", {
        fields: ["rpjmd_id", "target_module", "renstra_id", "source_stage", "source_ref_id"],
        type: "unique",
        name: "uniq_rpjmd_source_target_stage",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("rpjmd_source_maps", { transaction });
    });
  },
};
