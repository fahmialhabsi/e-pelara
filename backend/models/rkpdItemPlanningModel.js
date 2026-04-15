"use strict";
const { Model } = require("sequelize");

/** Baris RKPD (tabel `rkpd_item`) — dokumen induk: `rkpd_dokumen`. */
module.exports = (sequelize, DataTypes) => {
  class RkpdItem extends Model {
    static associate(models) {
      RkpdItem.belongsTo(models.RkpdDokumen, {
        foreignKey: "rkpd_dokumen_id",
        as: "rkpdDokumen",
      });
      RkpdItem.belongsTo(models.PerangkatDaerah, {
        foreignKey: "perangkat_daerah_id",
        as: "perangkatDaerah",
      });
      RkpdItem.hasMany(models.RenjaRkpdItemMap, {
        foreignKey: "rkpd_item_id",
        as: "renjaMaps",
      });
    }
  }

  RkpdItem.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      rkpd_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      prioritas_daerah: { type: DataTypes.STRING(512), allowNull: true },
      program: { type: DataTypes.STRING(512), allowNull: true },
      kegiatan: { type: DataTypes.STRING(512), allowNull: true },
      sub_kegiatan: { type: DataTypes.STRING(512), allowNull: true },
      indikator: { type: DataTypes.TEXT, allowNull: true },
      target: { type: DataTypes.DECIMAL(20, 4), allowNull: true },
      satuan: { type: DataTypes.STRING(64), allowNull: true },
      pagu: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      perangkat_daerah_id: { type: DataTypes.INTEGER, allowNull: true },
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
      current_rkpd_item_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      pagu_source: { type: DataTypes.STRING(32), allowNull: true, defaultValue: "rkpd" },
      pagu_line_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: "RkpdItem",
      tableName: "rkpd_item",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RkpdItem;
};
