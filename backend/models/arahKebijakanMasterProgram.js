"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ArahKebijakanMasterProgram extends Model {
    static associate(models) {
      ArahKebijakanMasterProgram.belongsTo(models.ArahKebijakan, {
        foreignKey: "arah_kebijakan_id",
        as: "arahKebijakan",
      });

      ArahKebijakanMasterProgram.belongsTo(models.MasterProgram, {
        foreignKey: "master_program_id",
        as: "masterProgram",
      });
    }
  }

  ArahKebijakanMasterProgram.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      arah_kebijakan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      master_program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      strategi_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ArahKebijakanMasterProgram",
      tableName: "arah_kebijakan_master_program",
      underscored: true,
    }
  );

  return ArahKebijakanMasterProgram;
};