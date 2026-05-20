"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RpjmdSourceMap extends Model {}

  RpjmdSourceMap.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      rpjmd_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      target_module: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "RENSTRA",
      },
      source_stage: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      source_table: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      source_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      source_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      source_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      target_table: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      target_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      target_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      parent_source_stage: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      parent_source_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      parent_target_stage: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      parent_target_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      mapping_status: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: "missing_source_map",
      },
      chain_status: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: "unchecked",
      },
      source_hash: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      target_hash: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      last_synced_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_checked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "RpjmdSourceMap",
      tableName: "rpjmd_source_maps",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RpjmdSourceMap;
};
