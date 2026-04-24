"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class JurnalUmum extends Model {
    static associate(models) {
      JurnalUmum.hasMany(models.JurnalDetail, {
        foreignKey: "jurnal_id",
        as: "details",
        onDelete: "CASCADE",
      });
    }
  }

  JurnalUmum.init(
    {
      nomor_jurnal: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      keterangan: { type: DataTypes.TEXT, allowNull: false },
      referensi: { type: DataTypes.STRING(100), allowNull: true },
      nomor_sp2d: { type: DataTypes.STRING(50), allowNull: true },
      jenis_jurnal: {
        type: DataTypes.ENUM("UMUM", "PENYESUAIAN", "PENUTUP", "KOREKSI"),
        allowNull: false,
        defaultValue: "UMUM",
      },
      sumber: {
        type: DataTypes.ENUM(
          "MANUAL",
          "AUTO_BKU",
          "AUTO_SPJ",
          "AUTO_PENYUSUTAN",
        ),
        allowNull: false,
        defaultValue: "MANUAL",
      },
      status: {
        type: DataTypes.ENUM("DRAFT", "POSTED", "VOID"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      dibuat_oleh: { type: DataTypes.INTEGER, allowNull: true },
      disetujui_oleh: { type: DataTypes.INTEGER, allowNull: true },
      tanggal_disetujui: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "JurnalUmum",
      tableName: "jurnal_umum",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return JurnalUmum;
};
