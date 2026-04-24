"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MappingIndikator extends Model {
    static associate(models) {
      MappingIndikator.belongsTo(models.RegulasiVersi, {
        foreignKey: "regulasi_versi_from_id",
        as: "regulasiFrom",
      });
      MappingIndikator.belongsTo(models.RegulasiVersi, {
        foreignKey: "regulasi_versi_to_id",
        as: "regulasiTo",
      });
      MappingIndikator.belongsTo(models.MappingSubKegiatan, {
        foreignKey: "mapping_sub_kegiatan_id",
        as: "mappingSubKegiatan",
      });
      MappingIndikator.belongsTo(models.MasterIndikator, {
        foreignKey: "old_master_indikator_id",
        as: "oldIndikator",
      });
      MappingIndikator.belongsTo(models.MasterIndikator, {
        foreignKey: "new_master_indikator_id",
        as: "newIndikator",
      });
    }
  }

  MappingIndikator.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      regulasi_versi_from_id: { type: DataTypes.INTEGER, allowNull: false },
      regulasi_versi_to_id: { type: DataTypes.INTEGER, allowNull: false },
      mapping_sub_kegiatan_id: DataTypes.INTEGER,
      old_master_indikator_id: DataTypes.INTEGER,
      new_master_indikator_id: DataTypes.INTEGER,
      old_indikator_text: DataTypes.TEXT,
      new_indikator_text: DataTypes.TEXT,
      old_satuan: DataTypes.STRING(128),
      new_satuan: DataTypes.STRING(128),
      confidence_score: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: false,
        defaultValue: 0,
      },
      mapping_type: {
        type: DataTypes.ENUM("auto", "manual"),
        allowNull: false,
        defaultValue: "auto",
      },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      match_reason: DataTypes.STRING(64),
    },
    {
      sequelize,
      modelName: "MappingIndikator",
      tableName: "mapping_indikator",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return MappingIndikator;
};
