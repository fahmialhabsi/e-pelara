"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SubKegiatan extends Model {
    static associate(models) {
      // Relasi ke Kegiatan
      SubKegiatan.belongsTo(models.Kegiatan, {
        foreignKey: "kegiatan_id",
        as: "kegiatan",
      });

      // Relasi ke Periode RPJMD
      SubKegiatan.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
    }
  }

  SubKegiatan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      kegiatan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      kode_sub_kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true },
      },
      nama_sub_kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true },
      },
      pagu_anggaran: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        defaultValue: 0,
      },
      total_pagu_anggaran: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
      },
      nama_opd: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nama_bidang_opd: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sub_bidang_opd: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      jenis_dokumen: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tahun: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "SubKegiatan",
      tableName: "sub_kegiatan",
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["periode_id", "kode_sub_kegiatan"],
          name: "unique_kode_sub_kegiatan_per_periode",
        },
        {
          unique: true,
          fields: ["periode_id", "nama_sub_kegiatan"],
          name: "unique_nama_sub_kegiatan_per_periode",
        },
      ],
    }
  );

  return SubKegiatan;
};
