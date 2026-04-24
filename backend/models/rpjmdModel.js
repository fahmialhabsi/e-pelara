"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RPJMD extends Model {
    static associate(models) {
      RPJMD.hasMany(models.Misi, {
        foreignKey: "rpjmd_id",
        as: "misi",
      });
      RPJMD.hasMany(models.Tujuan, {
        foreignKey: "rpjmd_id",
        as: "tujuan",
      });
    }
  }

  RPJMD.init(
    {
      nama_rpjmd: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kepala_daerah: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      wakil_kepala_daerah: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      periode_awal: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      periode_akhir: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tahun_penetapan: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      akronim: {
        type: DataTypes.STRING,
      },
      foto_kepala_daerah: {
        type: DataTypes.STRING,
      },
      foto_wakil_kepala_daerah: {
        type: DataTypes.STRING,
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
    },
    {
      timestamps: true, // Menambahkan kolom createdAt dan updatedAt secara otomatis
      createdAt: "createdAt", // Menentukan nama kolom createdAt di tabel
      updatedAt: "updatedAt", // Menentukan nama kolom updatedAt di tabel
      sequelize,
      modelName: "RPJMD",
      tableName: "rpjmd",
    }
  );

  return RPJMD;
};
