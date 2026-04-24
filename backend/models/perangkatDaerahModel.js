"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PerangkatDaerah extends Model {
    static associate(models) {
      PerangkatDaerah.hasMany(models.RenstraPdDokumen, {
        foreignKey: "perangkat_daerah_id",
        as: "renstraPdDokumens",
      });
      PerangkatDaerah.hasMany(models.RkpdItem, {
        foreignKey: "perangkat_daerah_id",
        as: "rkpdItems",
      });
      PerangkatDaerah.hasMany(models.RenjaDokumen, {
        foreignKey: "perangkat_daerah_id",
        as: "renjaDokumens",
      });
    }
  }

  PerangkatDaerah.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kode: { type: DataTypes.STRING(32), allowNull: true },
      nama: { type: DataTypes.STRING(255), allowNull: false },
      /** Baris uji/smoke — jangan tampil di picker operasional */
      is_test: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      aktif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: "PerangkatDaerah",
      tableName: "perangkat_daerah",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return PerangkatDaerah;
};
