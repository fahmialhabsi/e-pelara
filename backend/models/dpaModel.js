"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Dpa extends Model {
    static associate(models) {
      Dpa.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      Dpa.belongsTo(models.Rka, {
        foreignKey: "rka_id",
        as: "rka",
      });
    }
  }

  Dpa.init(
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
      rka_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      /** Kunci idempotensi derivasi RKA → DPA (selaras Renstra/RKPD/Renja). */
      derivation_key: {
        type: DataTypes.STRING(48),
        allowNull: true,
      },
      approval_status: {
        type: DataTypes.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      // Referensi kode rekening Permendagri 90 (nullable — backward compatible)
      kode_rekening: {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: null,
      },
      nama_rekening: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
      },
      realisasi: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Cross-check LRA (bukan sumber utama; utama dari BKU)",
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
      modelName: "Dpa",
      tableName: "dpa",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Dpa;
};
