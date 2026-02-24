"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Cascading extends Model {
    static associate(models) {
      Cascading.belongsTo(models.Misi, { foreignKey: "misi_id", as: "misi" });
      Cascading.belongsTo(models.PrioritasNasional, {
        foreignKey: "prior_nas_id",
        as: "priorNasional",
      });
      Cascading.belongsTo(models.PrioritasDaerah, {
        foreignKey: "prior_daerah_id",
        as: "priorDaerah",
      });
      Cascading.belongsTo(models.PrioritasGubernur, {
        foreignKey: "prior_kepda_id",
        as: "priorKepda",
      });
      Cascading.belongsTo(models.Tujuan, {
        foreignKey: "tujuan_id",
        as: "tujuan",
      });
      Cascading.belongsTo(models.Sasaran, {
        foreignKey: "sasaran_id",
        as: "sasaran",
      });
      Cascading.belongsTo(models.Program, {
        foreignKey: "program_id",
        as: "program",
      });
      Cascading.belongsTo(models.Kegiatan, {
        foreignKey: "kegiatan_id",
        as: "kegiatan",
      });

      // New many-to-many relations
      Cascading.belongsToMany(models.Strategi, {
        through: "cascading_strategi",
        foreignKey: "cascading_id",
        otherKey: "strategi_id",
        as: "strategis",
        timestamps: false,
      });

      Cascading.belongsToMany(models.ArahKebijakan, {
        through: "cascading_arah_kebijakan",
        foreignKey: "cascading_id",
        otherKey: "arah_kebijakan_id",
        as: "arahKebijakans",
        timestamps: false,
      });
    }
  }
  Cascading.init(
    {
      misi_id: DataTypes.INTEGER,
      prior_nas_id: DataTypes.BIGINT.UNSIGNED,
      prior_daerah_id: DataTypes.BIGINT.UNSIGNED,
      prior_kepda_id: DataTypes.BIGINT.UNSIGNED,
      tujuan_id: DataTypes.INTEGER,
      sasaran_id: DataTypes.INTEGER,
      program_id: DataTypes.INTEGER,
      kegiatan_id: DataTypes.INTEGER,
      jenis_dokumen: DataTypes.STRING,
      tahun: DataTypes.STRING,
      periode_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Cascading",
      tableName: "cascading",
      freezeTableName: true,
      timestamps: true,
    }
  );
  return Cascading;
};
