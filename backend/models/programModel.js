"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Program extends Model {
    static associate(models) {
      // Relasi ke Sasaran
      Program.belongsTo(models.Sasaran, {
        foreignKey: "sasaran_id",
        as: "sasaran",
      });

      // Relasi ke Periode RPJMD
      Program.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      // Relasi ke OPD Penanggung Jawab
      Program.belongsTo(models.OpdPenanggungJawab, {
        foreignKey: "opd_penanggung_jawab",
        as: "opd",
      });

      // Relasi ke Kegiatan
      Program.hasMany(models.Kegiatan, {
        foreignKey: "program_id",
        as: "kegiatan",
      });

      // Relasi many-to-many ke Strategi
      Program.belongsToMany(models.Strategi, {
        through: "program_strategi",
        foreignKey: "program_id",
        otherKey: "strategi_id",
        as: "Strategi",
      });

      // Relasi many-to-many ke Arah Kebijakan
      Program.belongsToMany(models.ArahKebijakan, {
        through: models.ProgramArahKebijakan,
        foreignKey: "program_id",
        otherKey: "arah_kebijakan_id",
        as: "ArahKebijakan",
      });
      Program.hasMany(models.Rkpd, {
        foreignKey: "program_id",
        as: "rkpd",
      });

      Program.belongsTo(models.RenstraProgram, {
        foreignKey: "rpjmd_id", // atau foreignKey yang sesuai
        as: "renstra_program",
      });

      Program.belongsTo(models.RegulasiVersi, {
        foreignKey: "regulasi_versi_id",
        as: "regulasiVersi",
      });
      Program.belongsTo(models.MasterProgram, {
        foreignKey: "master_program_id",
        as: "masterProgram",
      });
      Program.belongsTo(models.User, {
        foreignKey: "migrated_by",
        as: "migratedByUser",
      });
    }
  }

  Program.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sasaran_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      nama_program: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kode_program: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      locked_pagu: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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
      rpjmd_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      prioritas: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      opd_penanggung_jawab: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      bidang_opd_penanggung_jawab: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      jenis_dokumen: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tahun: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      master_program_id: {
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
      modelName: "Program",
      tableName: "program",
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["periode_id", "kode_program"],
          name: "unique_kode_program_per_periode",
        },
        {
          unique: true,
          fields: ["periode_id", "nama_program"],
          name: "unique_nama_program_per_periode",
        },
        {
          name: "idx_nama_program",
          fields: ["nama_program"],
        },
      ],
    }
  );

  return Program;
};
