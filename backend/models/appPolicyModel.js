"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AppPolicy extends Model {
    static associate(models) {
      AppPolicy.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updatedByUser",
      });
    }
  }

  AppPolicy.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      policy_key: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      policy_value: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      description: { type: DataTypes.TEXT, allowNull: true },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      updated_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: "AppPolicy",
      tableName: "app_policy",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return AppPolicy;
};
