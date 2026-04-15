"use strict";
const { Model } = require("sequelize");

/**
 * Canonical model dokumen Renstra (table: `renstra`).
 * Untuk struktur legacy bertingkat OPD gunakan `RenstraOPD` (`renstra_opd`).
 */
module.exports = (sequelize, DataTypes) => {
  class Renstra extends Model {
    static associate(models) {
      Renstra.hasMany(models.Renja, {
        foreignKey: "renstra_id",
        as: "renjaList",
      });
    }
  }

  Renstra.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      periode_awal: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      periode_akhir: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      judul: {
        type: DataTypes.STRING(255),
        allowNull: false,
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
      epelara_renstra_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      sinkronisasi_terakhir: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      sinkronisasi_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "belum_sinkron",
      },
      dokumen_url: {
        type: DataTypes.STRING(500),
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
      pagu_tahun_1: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_2: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_3: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_4: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_5: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      total_pagu: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
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
    },
    {
      sequelize,
      modelName: "Renstra",
      tableName: "renstra",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { name: "idx_renstra_periode", fields: ["periode_awal", "periode_akhir"] },
        { name: "idx_renstra_status", fields: ["status"] },
      ],
    },
  );

  return Renstra;
};
