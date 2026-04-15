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

      SubKegiatan.belongsTo(models.RegulasiVersi, {
        foreignKey: "regulasi_versi_id",
        as: "regulasiVersi",
      });
      SubKegiatan.belongsTo(models.MasterSubKegiatan, {
        foreignKey: "master_sub_kegiatan_id",
        as: "masterSubKegiatan",
      });
      SubKegiatan.belongsTo(models.User, {
        foreignKey: "migrated_by",
        as: "migratedByUser",
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
      master_sub_kegiatan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      regulasi_versi_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      input_mode: {
        type: DataTypes.ENUM("LEGACY", "MASTER"),
        allowNull: false,
        defaultValue: "LEGACY",
      },
      migration_status: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      migrated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      migrated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
