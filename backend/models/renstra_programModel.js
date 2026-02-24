"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraProgram extends Model {
    static associate(models) {
      RenstraProgram.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_id",
        targetKey: "id",
        as: "renstra",
      });

      RenstraProgram.belongsTo(models.Program, {
        foreignKey: "rpjmd_program_id",
        targetKey: "id",
        as: "program_rpjmd",
      });

      RenstraProgram.hasMany(models.RenstraKegiatan, {
        foreignKey: "program_id",
        as: "kegiatans",
      });

      RenstraProgram.hasMany(models.IndikatorRenstra, {
        foreignKey: "ref_id",
        constraints: false,
        scope: { stage: "program" },
        as: "indikators",
      });

      RenstraProgram.hasMany(models.RenstraTabelProgram, {
        foreignKey: "program_id",
        as: "tabelPrograms",
      });
    }
  }

  RenstraProgram.init(
    {
      kode_program: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nama_program: {
        type: DataTypes.STRING,
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
      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      rpjmd_program_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RenstraProgram",
      tableName: "renstra_program",
      underscored: true,
      timestamps: false,
    }
  );

  return RenstraProgram;
};
