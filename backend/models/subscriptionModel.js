"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
      Subscription.belongsTo(models.Tenant, { foreignKey: "tenant_id", as: "tenant" });
      Subscription.belongsTo(models.Plan, { foreignKey: "plan_id", as: "plan" });
    }
  }

  Subscription.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      tenant_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "tenants", key: "id" },
      },
      plan_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "plans", key: "id" },
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "draft",
      },
      started_at: { type: DataTypes.DATE, allowNull: true },
      ended_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "Subscription",
      tableName: "subscriptions",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  return Subscription;
};
