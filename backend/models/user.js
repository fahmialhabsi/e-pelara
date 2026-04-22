"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Role, { foreignKey: "role_id", as: "role" });
      User.belongsTo(models.Division, {
        foreignKey: "divisions_id",
        as: "division",
      });

      User.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
      User.belongsTo(models.Tenant, { foreignKey: "tenant_id", as: "tenant" });
    }
  }

  User.init(
    {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      opd: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      divisions_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "divisions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      tenant_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        references: {
          model: "tenants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      password_reset_token: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      password_reset_expires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      underscored: true,
      timestamps: false,
    }
  );

  return User;
};
