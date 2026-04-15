"use strict";

const { Model } = require("sequelize");

/** Format angka ke Rupiah Indonesia: Rp. xxx.xxx.xxx,xx */
function formatRupiahId(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "Rp. 0,00";
  const parts = n.toFixed(2).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp. ${intPart},${parts[1]}`;
}

module.exports = (sequelize, DataTypes) => {
  class KodeAkunBas extends Model {
    static associate() {}

    toJSON() {
      const v = this.get({ plain: true });
      return v;
    }
  }

  KodeAkunBas.init(
    {
      kode: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      nama: { type: DataTypes.STRING(255), allowNull: false },
      level: { type: DataTypes.INTEGER, allowNull: false },
      kode_induk: { type: DataTypes.STRING(30), allowNull: true },
      jenis: {
        type: DataTypes.ENUM(
          "PENDAPATAN",
          "BELANJA",
          "BEBAN",
          "ASET",
          "KEWAJIBAN",
          "EKUITAS",
          "PEMBIAYAAN",
        ),
        allowNull: false,
      },
      normal_balance: {
        type: DataTypes.ENUM("DEBIT", "KREDIT"),
        allowNull: false,
      },
      digunakan_di: {
        type: DataTypes.ENUM("LRA", "LO", "NERACA", "SEMUA"),
        allowNull: false,
        defaultValue: "SEMUA",
      },
      kode_rekening_ref: { type: DataTypes.STRING(30), allowNull: true },
      aktif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "KodeAkunBas",
      tableName: "kode_akun_bas",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  KodeAkunBas.formatRupiah = formatRupiahId;
  return KodeAkunBas;
};
