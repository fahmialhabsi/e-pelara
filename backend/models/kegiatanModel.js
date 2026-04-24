"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Kegiatan extends Model {
    static associate(models) {
      // Relasi ke Program
      Kegiatan.belongsTo(models.Program, {
        foreignKey: "program_id",
        as: "program",
      });

      // Relasi ke Periode
      Kegiatan.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      // Relasi ke SubKegiatan
      Kegiatan.hasMany(models.SubKegiatan, {
        foreignKey: "kegiatan_id",
        as: "sub_kegiatan",
      });

      // Relasi ke OPD
      Kegiatan.belongsTo(models.OpdPenanggungJawab, {
        foreignKey: "opd_penanggung_jawab",
        as: "opd",
      });

      // Relasi ke RKPD
      Kegiatan.hasMany(models.Rkpd, {
        foreignKey: "kegiatan_id",
        as: "rkpd",
      });

      Kegiatan.belongsTo(models.RegulasiVersi, {
        foreignKey: "regulasi_versi_id",
        as: "regulasiVersi",
      });
      Kegiatan.belongsTo(models.MasterKegiatan, {
        foreignKey: "master_kegiatan_id",
        as: "masterKegiatan",
      });
      Kegiatan.belongsTo(models.User, {
        foreignKey: "migrated_by",
        as: "migratedByUser",
      });
    }
  }

  Kegiatan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      kode_kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      nama_kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
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
      jenis_dokumen: {
        type: DataTypes.ENUM("rkpd", "renstra", "rpjmd"),
        allowNull: false,
      },
      tahun: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      opd_penanggung_jawab: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      bidang_opd_penanggung_jawab: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      master_kegiatan_id: {
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
      modelName: "Kegiatan",
      tableName: "kegiatan",
      underscored: true,
      defaultScope: {
        include: [
          {
            association: "program",
          },
          {
            association: "opd",
          },
        ],
      },
      indexes: [
        {
          unique: true,
          fields: ["periode_id", "jenis_dokumen", "kode_kegiatan"],
          name: "unique_kegiatan_kode_combination",
        },
        {
          unique: true,
          fields: ["periode_id", "jenis_dokumen", "nama_kegiatan"],
          name: "unique_kegiatan_nama_combination",
        },
      ],
    }
  );

  return Kegiatan;
};
