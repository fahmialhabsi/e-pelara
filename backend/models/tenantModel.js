"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Tenant extends Model {
    static associate(models) {
      Tenant.hasMany(models.User, { foreignKey: "tenant_id", as: "users" });
      Tenant.hasMany(models.Subscription, { foreignKey: "tenant_id", as: "subscriptions" });
    }
  }

  Tenant.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nama: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      domain: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Tenant",
      tableName: "tenants",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  return Tenant;
};
