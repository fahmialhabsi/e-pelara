"use strict";
const { Model } = require("sequelize");

/** Satu PD memetakan ke satu baris OPD penanggung jawab (ID), untuk filter program/cascading. */
module.exports = (sequelize, DataTypes) => {
  class PerangkatDaerahOpdMapping extends Model {
    static associate(models) {
      PerangkatDaerahOpdMapping.belongsTo(models.PerangkatDaerah, {
        foreignKey: "perangkat_daerah_id",
        as: "perangkatDaerah",
      });
      PerangkatDaerahOpdMapping.belongsTo(models.OpdPenanggungJawab, {
        foreignKey: "opd_penanggung_jawab_id",
        as: "opdPenanggungJawab",
      });
    }
  }

  PerangkatDaerahOpdMapping.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      perangkat_daerah_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      opd_penanggung_jawab_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: "PerangkatDaerahOpdMapping",
      tableName: "perangkat_daerah_opd_mapping",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return PerangkatDaerahOpdMapping;
};
