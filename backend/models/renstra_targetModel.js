// models/renstra_targetModel.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraTarget extends Model {
    static associate(models) {
      RenstraTarget.belongsTo(models.IndikatorRenstra, {
        foreignKey: "indikator_id",
        as: "indikator",
      });

      RenstraTarget.hasMany(models.RenstraTargetDetail, {
        foreignKey: "renstra_target_id",
        as: "details",
        onDelete: "CASCADE",
      });
    }
  }

  RenstraTarget.init(
    {
      indikator_id: DataTypes.INTEGER,
      lokasi: DataTypes.STRING,
      capaian_program: DataTypes.DECIMAL(18, 2),
      capaian_kegiatan: DataTypes.DECIMAL(18, 2),
      capaian_subkegiatan: DataTypes.DECIMAL(18, 2),
      satuan_program: DataTypes.STRING,
      pagu_program: DataTypes.BIGINT,
      satuan_kegiatan: DataTypes.STRING,
      pagu_kegiatan: DataTypes.BIGINT,
      satuan_subkegiatan: DataTypes.STRING,
      pagu_subkegiatan: DataTypes.BIGINT,
    },
    {
      sequelize,
      modelName: "RenstraTarget",
      tableName: "renstra_target",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RenstraTarget;
};
