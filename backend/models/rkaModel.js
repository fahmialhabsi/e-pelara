"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Rka extends Model {
    static associate(models) {
      Rka.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      Rka.belongsTo(models.Renja, {
        foreignKey: "renja_id",
        as: "renja",
      });
    }
  }

  Rka.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      program: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sub_kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      indikator: DataTypes.STRING,
      target: DataTypes.STRING,
      anggaran: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      jenis_dokumen: DataTypes.STRING,
      renja_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      change_reason_text: { type: DataTypes.TEXT, allowNull: true },
      change_reason_file: { type: DataTypes.STRING(255), allowNull: true },
      version: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      is_active_version: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      rpjmd_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      pagu_year_1: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_2: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_3: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_4: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_5: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_total: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
    },
    {
      sequelize,
      modelName: "Rka",
      tableName: "rka",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Rka;
};
