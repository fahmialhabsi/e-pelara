"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MappingSubKegiatan extends Model {
    static associate(models) {
      MappingSubKegiatan.belongsTo(models.RegulasiVersi, {
        foreignKey: "regulasi_versi_from_id",
        as: "regulasiFrom",
      });
      MappingSubKegiatan.belongsTo(models.RegulasiVersi, {
        foreignKey: "regulasi_versi_to_id",
        as: "regulasiTo",
      });
      MappingSubKegiatan.belongsTo(models.MasterSubKegiatan, {
        foreignKey: "old_master_sub_kegiatan_id",
        as: "oldSub",
      });
      MappingSubKegiatan.belongsTo(models.MasterSubKegiatan, {
        foreignKey: "new_master_sub_kegiatan_id",
        as: "newSub",
      });
      MappingSubKegiatan.hasMany(models.MappingIndikator, {
        foreignKey: "mapping_sub_kegiatan_id",
        as: "mappingIndikators",
      });
      MappingSubKegiatan.belongsTo(models.User, {
        foreignKey: "applied_by",
        as: "appliedByUser",
      });
      MappingSubKegiatan.hasMany(models.MappingSubKegiatanResolution, {
        foreignKey: "mapping_sub_kegiatan_id",
        as: "splitResolutions",
      });
    }
  }

  MappingSubKegiatan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      regulasi_versi_from_id: { type: DataTypes.INTEGER, allowNull: false },
      regulasi_versi_to_id: { type: DataTypes.INTEGER, allowNull: false },
      old_master_sub_kegiatan_id: DataTypes.INTEGER,
      new_master_sub_kegiatan_id: DataTypes.INTEGER,
      old_kode_sub_kegiatan_full: DataTypes.STRING(255),
      new_kode_sub_kegiatan_full: DataTypes.STRING(255),
      old_nama_sub_kegiatan: DataTypes.TEXT,
      new_nama_sub_kegiatan: DataTypes.TEXT,
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
      applied_at: { type: DataTypes.DATE, allowNull: true },
      applied_by: { type: DataTypes.INTEGER, allowNull: true },
      applied_count: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: "MappingSubKegiatan",
      tableName: "mapping_sub_kegiatan",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return MappingSubKegiatan;
};
