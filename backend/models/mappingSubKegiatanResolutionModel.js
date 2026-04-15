"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MappingSubKegiatanResolution extends Model {
    static associate(models) {
      MappingSubKegiatanResolution.belongsTo(models.MappingSubKegiatan, {
        foreignKey: "mapping_sub_kegiatan_id",
        as: "mappingSubKegiatan",
      });
      MappingSubKegiatanResolution.belongsTo(models.MasterSubKegiatan, {
        foreignKey: "old_master_sub_kegiatan_id",
        as: "oldSub",
      });
      MappingSubKegiatanResolution.belongsTo(models.MasterSubKegiatan, {
        foreignKey: "selected_new_master_sub_kegiatan_id",
        as: "selectedNewSub",
      });
      MappingSubKegiatanResolution.belongsTo(models.User, {
        foreignKey: "resolved_by",
        as: "resolvedByUser",
      });
      MappingSubKegiatanResolution.belongsTo(models.OpdPenanggungJawab, {
        foreignKey: "opd_id",
        as: "opdScope",
      });
    }
  }

  MappingSubKegiatanResolution.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      mapping_sub_kegiatan_id: { type: DataTypes.INTEGER, allowNull: false },
      old_master_sub_kegiatan_id: { type: DataTypes.INTEGER, allowNull: false },
      selected_new_master_sub_kegiatan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      opd_id: { type: DataTypes.INTEGER, allowNull: true },
      tahun: { type: DataTypes.INTEGER, allowNull: true },
      jenis_dokumen: { type: DataTypes.STRING(64), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      resolved_by: { type: DataTypes.INTEGER, allowNull: true },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "MappingSubKegiatanResolution",
      tableName: "mapping_sub_kegiatan_resolution",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return MappingSubKegiatanResolution;
};
