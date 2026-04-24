"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RkpdRenjaCascadeTrace extends Model {
    static associate(models) {
      RkpdRenjaCascadeTrace.belongsTo(models.RkpdItem, {
        foreignKey: "rkpd_item_id",
        as: "rkpdItem",
      });
      RkpdRenjaCascadeTrace.belongsTo(models.RenjaItem, {
        foreignKey: "renja_item_id",
        as: "renjaItem",
      });
    }
  }

  RkpdRenjaCascadeTrace.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      rkpd_item_id: { type: DataTypes.INTEGER, allowNull: false },
      renja_item_id: { type: DataTypes.INTEGER, allowNull: false },
      change_batch_id: { type: DataTypes.STRING(40), allowNull: false },
      cascade_type: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "field_sync" },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "RkpdRenjaCascadeTrace",
      tableName: "rkpd_renja_cascade_trace",
      underscored: true,
      timestamps: false,
    },
  );

  return RkpdRenjaCascadeTrace;
};
