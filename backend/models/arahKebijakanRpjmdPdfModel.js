"use strict";
const { Model } = require("sequelize");

/** Narasi arah kebijakan per misi dari dokumen RPJMD (PDF), terpisah dari entitas `arah_kebijakan` operasional. */
module.exports = (sequelize, DataTypes) => {
  class ArahKebijakanRpjmdPdf extends Model {
    static associate(models) {
      ArahKebijakanRpjmdPdf.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_rpjmd_id",
        as: "periodeRpjmd",
      });
    }
  }

  ArahKebijakanRpjmdPdf.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periode_rpjmd_id: { type: DataTypes.INTEGER, allowNull: false },
      no_misi: { type: DataTypes.INTEGER, allowNull: false },
      misi_ringkas: { type: DataTypes.STRING(512), allowNull: true },
      arah_kebijakan: { type: DataTypes.TEXT({ length: "medium" }), allowNull: false },
    },
    {
      sequelize,
      modelName: "ArahKebijakanRpjmdPdf",
      tableName: "arah_kebijakan_rpjmd",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return ArahKebijakanRpjmdPdf;
};
