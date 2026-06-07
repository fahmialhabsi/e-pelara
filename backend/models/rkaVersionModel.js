'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RkaVersion extends Model {
    static associate(models) {
      RkaVersion.belongsTo(models.Rka, {
        foreignKey: 'rka_id',
        as: 'rka',
      });
    }
  }

  RkaVersion.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      rka_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      version_number: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      snapshot_json: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'RkaVersion',
      tableName: 'rka_versions',
      underscored: true,
      timestamps: false,
    },
  );

  return RkaVersion;
};
