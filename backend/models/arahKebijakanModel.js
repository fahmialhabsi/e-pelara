"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ArahKebijakan extends Model {
    static associate(models) {
      ArahKebijakan.belongsTo(models.Strategi, {
        foreignKey: "strategi_id",
        as: "Strategi",
      });

      ArahKebijakan.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      ArahKebijakan.belongsToMany(models.Program, {
        through: models.ProgramArahKebijakan, // ✅ benar: refer ke model
        foreignKey: "arah_kebijakan_id",
        otherKey: "program_id",
        as: "Program",
      });

      ArahKebijakan.belongsToMany(models.Cascading, {
        through: "CascadingArahKebijakan",
        foreignKey: "arah_kebijakan_id",
        otherKey: "cascading_id",
        as: "cascadings",
      });

      ArahKebijakan.hasMany(models.Rkpd, {
        foreignKey: "arah_kebijakan_id",
        as: "rkpd",
      });
    }
  }

  ArahKebijakan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      strategi_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
      },
      kode_arah: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      deskripsi: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      jenis_dokumen: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ArahKebijakan",
      tableName: "arah_kebijakan",
      underscored: true,
      timestamps: true,
      indexes: [
        {
          name: "unique_arah_kebijakan_combination_v2", // sebelumnya v1
          unique: true,
          fields: [
            "strategi_id",
            "kode_arah",
            sequelize.literal("deskripsi(100)"), // jika ingin representasi eksplisit
            sequelize.literal("jenis_dokumen(100)"),
            "tahun",
            "periode_id",
          ],
        },
      ],
    }
  );

  return ArahKebijakan;
};
