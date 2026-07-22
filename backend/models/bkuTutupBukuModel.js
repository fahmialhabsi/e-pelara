"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BkuTutupBuku extends Model {
    static associate() {}
  }

  BkuTutupBuku.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      bulan: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM("BELUM_TUTUP", "DITUTUP", "DISETUJUI"),
        defaultValue: "BELUM_TUTUP",
      },
      saldo_awal: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      total_penerimaan: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      total_pengeluaran: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      saldo_akhir: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      ditutup_oleh: { type: DataTypes.INTEGER, allowNull: true },
      ditutup_at: { type: DataTypes.DATE, allowNull: true },
      disetujui_oleh: { type: DataTypes.INTEGER, allowNull: true },
      disetujui_at: { type: DataTypes.DATE, allowNull: true },
      catatan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "BkuTutupBuku",
      tableName: "bku_tutup_buku",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return BkuTutupBuku;
};
