"use strict";
const { Model } = require("sequelize");

/** Mapping 1:1 utama: satu `renja_item` ↔ satu `rkpd_item`. */
module.exports = (sequelize, DataTypes) => {
  class RenjaRkpdItemMap extends Model {
    static associate(models) {
      RenjaRkpdItemMap.belongsTo(models.RenjaItem, {
        foreignKey: "renja_item_id",
        as: "renjaItem",
      });
      RenjaRkpdItemMap.belongsTo(models.RkpdItem, {
        foreignKey: "rkpd_item_id",
        as: "rkpdItem",
      });
    }
  }

  RenjaRkpdItemMap.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      renja_item_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      rkpd_item_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: "RenjaRkpdItemMap",
      tableName: "renja_rkpd_item_map",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RenjaRkpdItemMap;
};
