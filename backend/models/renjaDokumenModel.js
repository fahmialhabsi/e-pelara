"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaDokumen extends Model {
    static associate(models) {
      RenjaDokumen.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
      RenjaDokumen.belongsTo(models.PerangkatDaerah, {
        foreignKey: "perangkat_daerah_id",
        as: "perangkatDaerah",
      });
      RenjaDokumen.belongsTo(models.RenstraPdDokumen, {
        foreignKey: "renstra_pd_dokumen_id",
        as: "renstraPdDokumen",
      });
      RenjaDokumen.belongsTo(models.RkpdDokumen, {
        foreignKey: "rkpd_dokumen_id",
        as: "rkpdDokumen",
      });
      RenjaDokumen.belongsTo(models.Renja, {
        foreignKey: "legacy_renja_id",
        as: "legacyRenja",
      });
      RenjaDokumen.hasMany(models.RenjaItem, {
        foreignKey: "renja_dokumen_id",
        as: "items",
      });
      RenjaDokumen.hasMany(models.RenjaDokumenSection, {
        foreignKey: "renja_dokumen_id",
        as: "sections",
      });
      RenjaDokumen.hasMany(models.RenjaDokumenVersion, {
        foreignKey: "renja_dokumen_id",
        as: "versions",
      });
      RenjaDokumen.hasMany(models.RenjaSnapshot, {
        foreignKey: "renja_dokumen_id",
        as: "snapshots",
      });
      RenjaDokumen.hasMany(models.RenjaRevisionLog, {
        foreignKey: "renja_dokumen_id",
        as: "revisionLogs",
      });
    }
  }

  RenjaDokumen.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periode_id: { type: DataTypes.INTEGER, allowNull: false },
      tahun: { type: DataTypes.INTEGER, allowNull: false },
      perangkat_daerah_id: { type: DataTypes.INTEGER, allowNull: false },
      renstra_pd_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      rkpd_dokumen_id: { type: DataTypes.INTEGER, allowNull: true },
      judul: { type: DataTypes.STRING(512), allowNull: false },
      versi: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      status: {
        type: DataTypes.ENUM("draft", "review", "final"),
        allowNull: false,
        defaultValue: "draft",
      },
      workflow_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "draft",
      },
      document_phase: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "rancangan_awal",
      },
      document_kind: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "renja_awal",
      },
      is_final_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      nomor_dokumen: { type: DataTypes.STRING(100), allowNull: true },
      nama_dokumen: { type: DataTypes.STRING(255), allowNull: true },
      parent_dokumen_id: { type: DataTypes.INTEGER, allowNull: true },
      base_dokumen_id: { type: DataTypes.INTEGER, allowNull: true },
      is_perubahan: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      perubahan_ke: { type: DataTypes.INTEGER, allowNull: true },
      tanggal_pengesahan: { type: DataTypes.DATEONLY, allowNull: true },
      tanggal_mulai_berlaku: { type: DataTypes.DATEONLY, allowNull: true },
      tanggal_akhir_berlaku: { type: DataTypes.DATEONLY, allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      current_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      published_at: { type: DataTypes.DATE, allowNull: true },
      published_by: { type: DataTypes.INTEGER, allowNull: true },
      approved_by: { type: DataTypes.INTEGER, allowNull: true },
      approved_at: { type: DataTypes.DATE, allowNull: true },
      derivation_key: { type: DataTypes.STRING(128), allowNull: true },
      legacy_renja_id: { type: DataTypes.INTEGER, allowNull: true },
      /** Narasi opsional bab dokumen resmi (override boilerplate generator) */
      text_bab1: { type: DataTypes.TEXT, allowNull: true },
      text_bab2: { type: DataTypes.TEXT, allowNull: true },
      text_bab5: { type: DataTypes.TEXT, allowNull: true },
      is_test: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
      updated_by: { type: DataTypes.INTEGER, allowNull: true },
      deleted_by: { type: DataTypes.INTEGER, allowNull: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "RenjaDokumen",
      tableName: "renja_dokumen",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RenjaDokumen;
};
