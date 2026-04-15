"use strict";
const { Model } = require("sequelize");

/**
 * Canonical model Renja (table: `renja`).
 * - field "Skema refactor" = canonical untuk endpoint planning baru
 * - field "Skema legacy"   = compatibility-only untuk modul lama
 */
module.exports = (sequelize, DataTypes) => {
  class Renja extends Model {
    static associate(models) {
      Renja.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      Renja.belongsTo(models.Rkpd, {
        foreignKey: "rkpd_id",
        as: "rkpd",
      });

      Renja.hasMany(models.Rkpd, {
        foreignKey: "renja_id",
        as: "rkpds",
      });

      Renja.belongsTo(models.Renstra, {
        foreignKey: "renstra_id",
        as: "renstra",
      });
    }
  }

  Renja.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // Skema refactor (planning doc-centric)
      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      judul: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      perangkat_daerah: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      ketersediaan_submitted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      distribusi_submitted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      konsumsi_submitted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      uptd_submitted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "draft",
      },
      approval_status: {
        type: DataTypes.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      epelara_renja_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      sinkronisasi_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "belum_sinkron",
      },
      sinkronisasi_terakhir: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dibuat_oleh: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      disetujui_oleh: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      disetujui_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // Skema legacy (tetap dipertahankan agar kompatibel)
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      program: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      kegiatan: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      sub_kegiatan: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      indikator: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      target: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      anggaran: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
      },
      jenis_dokumen: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      rkpd_id: {
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
      modelName: "Renja",
      tableName: "renja",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Renja;
};
