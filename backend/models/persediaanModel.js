"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Persediaan extends Model {
    static associate() {}
  }

  Persediaan.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      nama_barang: { type: DataTypes.STRING(255), allowNull: false },
      satuan: { type: DataTypes.STRING(30), allowNull: true },
      jumlah: { type: DataTypes.DECIMAL(18, 4), defaultValue: 0 },
      harga_satuan: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      nilai: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      tanggal_opname: { type: DataTypes.DATEONLY, allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "Persediaan",
      tableName: "persediaan",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return Persediaan;
};
