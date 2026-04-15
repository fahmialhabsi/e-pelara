"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SaldoAkun extends Model {
    static associate() {}
  }

  SaldoAkun.init(
    {
      kode_akun: { type: DataTypes.STRING(30), allowNull: false },
      nama_akun: { type: DataTypes.STRING(255), allowNull: true },
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      bulan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "0=tahunan, 1-12=bulan",
      },
      saldo_awal: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_debit: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_kredit: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      saldo_akhir: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      terakhir_diperbarui: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "SaldoAkun",
      tableName: "saldo_akun",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return SaldoAkun;
};
