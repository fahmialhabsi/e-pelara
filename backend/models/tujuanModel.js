"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Tujuan extends Model {
    static associate(models) {
      Tujuan.belongsTo(models.RPJMD, {
        foreignKey: "rpjmd_id",
        as: "Rpjmd",
      });

      Tujuan.belongsTo(models.Misi, {
        foreignKey: "misi_id",
        as: "Misi",
      });

      Tujuan.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
      Tujuan.belongsTo(models.Tenant, { foreignKey: "tenant_id", as: "tenant" });

      Tujuan.hasMany(models.Sasaran, {
        foreignKey: "tujuan_id",
        as: "Tujuan",
      });

      Tujuan.hasMany(models.IndikatorTujuan, {
        foreignKey: "tujuan_id",
        as: "indikatorTujuan",
      });
      Tujuan.hasMany(models.Rkpd, { foreignKey: "tujuan_id", as: "rkpd" });
    }
  }

  Tujuan.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      rpjmd_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "rpjmds",
          key: "id",
        },
      },
      misi_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tenant_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        references: { model: "tenants", key: "id" },
      },
      no_tujuan: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isi_tujuan: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      jenis_dokumen: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Tujuan",
      tableName: "tujuan",
      underscored: true,
      timestamps: false,
      indexes: [
        {
          unique: true,
          name: "unique_tujuan_combination",
          fields: [
            "misi_id",
            "no_tujuan",
            "jenis_dokumen",
            "tahun",
            "periode_id",
          ],
        },
      ],
    }
  );

  return Tujuan;
};
