"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Visi extends Model {
    static associate(models) {
      // Relasi ke Misi (1 visi punya banyak misi)
      Visi.hasMany(models.Misi, { foreignKey: "visi_id", as: "misiFromVisi" });
    }
  }

  Visi.init(
    {
      isi_visi: {
        type: DataTypes.TEXT,
        allowNull: false, // Validasi agar isi_visi wajib diisi
      },
      tahun_awal: {
        type: DataTypes.INTEGER,
        allowNull: false, // Validasi agar tahun_awal wajib diisi
        validate: {
          isInt: true, // Validasi agar tahun_awal adalah angka
        },
      },
      tahun_akhir: {
        type: DataTypes.INTEGER,
        allowNull: false, // Validasi agar tahun_akhir wajib diisi
        validate: {
          isInt: true, // Validasi agar tahun_akhir adalah angka
        },
      },
    },
    {
      sequelize,
      modelName: "Visi",
      tableName: "visi",
      underscored: true,
      validate: {
        // Custom validation untuk memastikan tahun_awal lebih kecil dari tahun_akhir
        tahunValidasi() {
          if (this.tahun_awal >= this.tahun_akhir) {
            throw new Error("Tahun awal harus lebih kecil dari tahun akhir");
          }
        },
      },
    }
  );

  return Visi;
};
