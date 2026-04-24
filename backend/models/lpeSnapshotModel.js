"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LpeSnapshot extends Model {
    static associate() {}
  }

  LpeSnapshot.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      komponen: {
        type: DataTypes.ENUM(
          "EKUITAS_AWAL",
          "SURPLUS_DEFISIT_LO",
          "KOREKSI_PERSEDIAAN",
          "KOREKSI_ASET_TETAP",
          "KOREKSI_LAINNYA",
          "KEWAJIBAN_KONSOLIDASIKAN",
          "EKUITAS_AKHIR",
        ),
        allowNull: false,
      },
      nilai_tahun_ini: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      nilai_tahun_lalu: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      urutan: { type: DataTypes.INTEGER, allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      dikunci: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      sequelize,
      modelName: "LpeSnapshot",
      tableName: "lpe_snapshot",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return LpeSnapshot;
};
