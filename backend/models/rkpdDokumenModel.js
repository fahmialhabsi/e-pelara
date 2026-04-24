"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RkpdDokumen extends Model {
    static associate(models) {
      RkpdDokumen.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
      RkpdDokumen.hasMany(models.RkpdItem, {
        foreignKey: "rkpd_dokumen_id",
        as: "items",
      });
      RkpdDokumen.hasMany(models.RenjaDokumen, {
        foreignKey: "rkpd_dokumen_id",
        as: "renjaDokumens",
      });
    }
  }

  RkpdDokumen.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periode_id: { type: DataTypes.INTEGER, allowNull: false },
      tahun: { type: DataTypes.INTEGER, allowNull: false },
      judul: { type: DataTypes.STRING(512), allowNull: false },
      versi: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      status: {
        type: DataTypes.ENUM("draft", "review", "final"),
        allowNull: false,
        defaultValue: "draft",
      },
      is_final_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      tanggal_pengesahan: { type: DataTypes.DATEONLY, allowNull: true },
      derivation_key: { type: DataTypes.STRING(128), allowNull: true },
      is_test: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      /** Narasi BAB II (analisis) untuk dokumen resmi — wajib diisi sebelum ekspor */
      text_bab2: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "RkpdDokumen",
      tableName: "rkpd_dokumen",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RkpdDokumen;
};
