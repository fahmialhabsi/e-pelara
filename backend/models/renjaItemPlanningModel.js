"use strict";
const { Model } = require("sequelize");

/** Baris Renja PD (tabel `renja_item`). */
module.exports = (sequelize, DataTypes) => {
  class RenjaItem extends Model {
    static associate(models) {
      RenjaItem.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
      RenjaItem.hasOne(models.RenjaRkpdItemMap, {
        foreignKey: "renja_item_id",
        as: "rkpdLink",
      });
    }
  }

  RenjaItem.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      renja_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      source_mode: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "MANUAL" },
      source_renstra_program_id: { type: DataTypes.INTEGER, allowNull: true },
      source_renstra_kegiatan_id: { type: DataTypes.INTEGER, allowNull: true },
      source_renstra_subkegiatan_id: { type: DataTypes.INTEGER, allowNull: true },
      source_indikator_renstra_id: { type: DataTypes.INTEGER, allowNull: true },
      source_rkpd_item_id: { type: DataTypes.INTEGER, allowNull: true },
      program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      kegiatan_id: { type: DataTypes.INTEGER, allowNull: true },
      sub_kegiatan_id: { type: DataTypes.INTEGER, allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      kode_program: { type: DataTypes.STRING(50), allowNull: true },
      kode_kegiatan: { type: DataTypes.STRING(50), allowNull: true },
      kode_sub_kegiatan: { type: DataTypes.STRING(50), allowNull: true },
      program: { type: DataTypes.STRING(512), allowNull: true },
      kegiatan: { type: DataTypes.STRING(512), allowNull: true },
      sub_kegiatan: { type: DataTypes.STRING(512), allowNull: true },
      indikator: { type: DataTypes.TEXT, allowNull: true },
      target: { type: DataTypes.DECIMAL(20, 4), allowNull: true },
      target_numerik: { type: DataTypes.DECIMAL(20, 4), allowNull: true },
      target_teks: { type: DataTypes.STRING(255), allowNull: true },
      satuan: { type: DataTypes.STRING(64), allowNull: true },
      lokasi: { type: DataTypes.STRING(255), allowNull: true },
      kelompok_sasaran: { type: DataTypes.STRING(255), allowNull: true },
      pagu: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_indikatif: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      catatan: { type: DataTypes.TEXT, allowNull: true },
      mismatch_status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "matched" },
      status_baris: {
        type: DataTypes.ENUM("draft", "siap", "terkunci"),
        allowNull: false,
        defaultValue: "draft",
      },
      change_state: {
        type: DataTypes.STRING(32),
        allowNull: true,
        defaultValue: "original",
      },
      current_renja_item_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      pagu_source: { type: DataTypes.STRING(32), allowNull: true, defaultValue: "renja" },
      pagu_line_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: "RenjaItem",
      tableName: "renja_item",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RenjaItem;
};
