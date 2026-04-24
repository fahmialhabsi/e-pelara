"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Plan extends Model {
    static associate(models) {
      Plan.hasMany(models.Subscription, { foreignKey: "plan_id", as: "subscriptions" });
    }
  }

  Plan.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      nama: { type: DataTypes.STRING(255), allowNull: false },
      deskripsi: { type: DataTypes.TEXT, allowNull: true },
      features: { type: DataTypes.JSON, allowNull: true },
    },
    {
      sequelize,
      modelName: "Plan",
      tableName: "plans",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  return Plan;
};
