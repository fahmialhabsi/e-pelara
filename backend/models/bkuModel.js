"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Bku extends Model {
    static associate(models) {
      Bku.belongsTo(models.Dpa, { foreignKey: "dpa_id", as: "dpa" });
      Bku.belongsTo(models.JurnalUmum, { foreignKey: "jurnal_id", as: "jurnal" });
      Bku.hasMany(models.BkuObjek, { foreignKey: "bku_id", as: "objek_rows" });
    }
  }

  Bku.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      bulan: { type: DataTypes.INTEGER, allowNull: false },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      nomor_bukti: { type: DataTypes.STRING(60), allowNull: true },
      nomor_spm: { type: DataTypes.STRING(50), allowNull: true },
      nomor_sp2d: { type: DataTypes.STRING(50), allowNull: true },
      uraian: { type: DataTypes.TEXT, allowNull: false },
      jenis_transaksi: {
        type: DataTypes.ENUM(
          "UP",
          "GU",
          "TUP",
          "LS_GAJI",
          "LS_BARANG",
          "PENERIMAAN_LAIN",
          "PENGELUARAN_LAIN",
          "SETORAN_SISA_UP",
        ),
        allowNull: false,
      },
      penerimaan: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      pengeluaran: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      saldo: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      kode_akun: { type: DataTypes.STRING(30), allowNull: true },
      dpa_id: { type: DataTypes.INTEGER, allowNull: true },
      jurnal_id: { type: DataTypes.INTEGER, allowNull: true },
      sigap_spj_id: { type: DataTypes.INTEGER, allowNull: true },
      sigap_bku_id: { type: DataTypes.INTEGER, allowNull: true },
      bendahara_id: { type: DataTypes.INTEGER, allowNull: true },
      status_validasi: {
        type: DataTypes.ENUM("BELUM", "VALID", "DITOLAK"),
        defaultValue: "BELUM",
      },
      catatan_validasi: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "Bku",
      tableName: "bku",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return Bku;
};
