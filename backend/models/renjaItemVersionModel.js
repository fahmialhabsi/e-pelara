"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaItemVersion extends Model {
    static associate(models) {
      RenjaItemVersion.belongsTo(models.RenjaItem, {
        foreignKey: "renja_item_id",
        as: "renjaItem",
      });
    }
  }

  RenjaItemVersion.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_item_id: { type: DataTypes.INTEGER, allowNull: false },
      version_seq: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      dokumen_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      snapshot_data: { type: DataTypes.JSON, allowNull: true },
      pagu_value: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_context_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      pagu_source: { type: DataTypes.STRING(32), allowNull: true },
      change_state: { type: DataTypes.STRING(32), allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
      is_current: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: "RenjaItemVersion",
      tableName: "renja_item_version",
      underscored: true,
      timestamps: false,
    },
  );

  return RenjaItemVersion;
};
