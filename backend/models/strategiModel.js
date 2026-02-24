// models/strategi.js
"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Strategi extends Model {
    static associate(models) {
      Strategi.belongsTo(models.Sasaran, {
        foreignKey: "sasaran_id",
        as: "Sasaran",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      Strategi.hasMany(models.ArahKebijakan, {
        foreignKey: "strategi_id",
        as: "ArahKebijakan",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });

      Strategi.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });

      Strategi.belongsToMany(models.Program, {
        through: {
          model: "program_strategi",
          timestamps: false, // <- tambahkan ini
        },
        foreignKey: "strategi_id",
        otherKey: "program_id",
        as: "Program",
      });
      Strategi.belongsToMany(models.Cascading, {
        through: "CascadingStrategi",
        foreignKey: "strategi_id",
        otherKey: "cascading_id",
        as: "cascadings",
      });
      Strategi.hasMany(models.Rkpd, {
        foreignKey: "strategi_id",
        as: "rkpd",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }
  }
  Strategi.init(
    {
      sasaran_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: sequelize.models.PeriodeRpjmd,
          key: "id",
        },
      },
      kode_strategi: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 255],
        },
      },
      deskripsi: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      jenis_dokumen: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          is: /^\d{4}$/, // pastikan tahun 4 digit
        },
      },
    },
    {
      sequelize,
      modelName: "Strategi",
      tableName: "strategi",
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: [
            "sasaran_id",
            "jenis_dokumen",
            "tahun",
            "periode_id",
            "deskripsi",
          ],
        },
      ],
    }
  );
  return Strategi;
};
