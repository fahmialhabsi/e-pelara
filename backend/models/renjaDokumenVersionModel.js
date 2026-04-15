"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaDokumenVersion extends Model {
    static associate(models) {
      RenjaDokumenVersion.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
    }
  }

  RenjaDokumenVersion.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      version_number: { type: DataTypes.INTEGER, allowNull: false },
      version_label: { type: DataTypes.STRING(100), allowNull: true },
      parent_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      base_dokumen_id: { type: DataTypes.INTEGER, allowNull: true },
      change_type: { type: DataTypes.STRING(32), allowNull: true },
      change_reason: { type: DataTypes.TEXT, allowNull: true },
      snapshot_data: { type: DataTypes.JSON, allowNull: true },
      snapshot_hash: { type: DataTypes.STRING(64), allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
      is_current: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "draft" },
      is_published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      published_at: { type: DataTypes.DATE, allowNull: true },
      approved_by: { type: DataTypes.INTEGER, allowNull: true },
      approved_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "RenjaDokumenVersion",
      tableName: "renja_dokumen_version",
      underscored: true,
      timestamps: false,
    },
  );

  return RenjaDokumenVersion;
};
