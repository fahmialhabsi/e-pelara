"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegulasiVersi extends Model {
    static associate(models) {
      RegulasiVersi.hasMany(models.MasterProgram, {
        foreignKey: "regulasi_versi_id",
        as: "masterPrograms",
      });
      RegulasiVersi.hasMany(models.Program, {
        foreignKey: "regulasi_versi_id",
        as: "programs",
      });
      RegulasiVersi.hasMany(models.Kegiatan, {
        foreignKey: "regulasi_versi_id",
        as: "kegiatans",
      });
      RegulasiVersi.hasMany(models.SubKegiatan, {
        foreignKey: "regulasi_versi_id",
        as: "subKegiatans",
      });
      RegulasiVersi.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "createdByUser",
      });
    }
  }

  RegulasiVersi.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nama_regulasi: { type: DataTypes.STRING(255), allowNull: false },
      /** Kolom legacy; pertahankan untuk kompatibilitas data & query lama */
      nomor_regulasi: { type: DataTypes.STRING(128), allowNull: false },
      /** Paralel spesifikasi Kepmendagri; jika null, UI/API boleh fallback ke nomor_regulasi */
      nomor_peraturan: { type: DataTypes.STRING(128), allowNull: true },
      tahun: { type: DataTypes.SMALLINT, allowNull: false },
      tanggal_berlaku: { type: DataTypes.DATEONLY, allowNull: true },
      deskripsi: DataTypes.TEXT,
      sumber_dokumen_url: { type: DataTypes.STRING(512), allowNull: true },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "RegulasiVersi",
      tableName: "regulasi_versi",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RegulasiVersi;
};
