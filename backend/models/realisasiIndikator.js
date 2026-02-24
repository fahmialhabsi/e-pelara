"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RealisasiIndikator extends Model {
  }

  RealisasiIndikator.init(
    {
      id_realisasi: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: "id_realisasi",
      },
      indikator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      periode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nilai_realisasi: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "RealisasiIndikator",
      
      tableName: "realisasi_indikator",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    
    }
  );

  return RealisasiIndikator;
};
