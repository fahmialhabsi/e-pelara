"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraSubkegiatan extends Model {
    static associate(models) {
      // Relasi ke RenstraProgram
      this.belongsTo(models.RenstraProgram, {
        foreignKey: "renstra_program_id",
        as: "program",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // Relasi ke RenstraKegiatan
      this.belongsTo(models.RenstraKegiatan, {
        foreignKey: "kegiatan_id",
        as: "kegiatan",
      });

      // Relasi ke SubKegiatan
      this.belongsTo(models.SubKegiatan, {
        foreignKey: "sub_kegiatan_id",
        as: "subKegiatan",
      });

      // ❌ JANGAN ADA relasi ke RenstraOPD di sini
      // Karena tabel `renstra_subkegiatan` memang tidak punya kolom `renstra_opd_id`

      // Relasi ke IndikatorRenstra
      this.hasMany(models.IndikatorRenstra, {
        foreignKey: "ref_id",
        constraints: false,
        scope: { stage: "sub_kegiatan" },
        as: "indikators",
      });
    }
  }

  RenstraSubkegiatan.init(
    {
      renstra_program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      kegiatan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sub_kegiatan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      kode_sub_kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nama_sub_kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sub_bidang_opd: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      nama_opd: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      nama_bidang_opd: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RenstraSubkegiatan",
      tableName: "renstra_subkegiatan",
      underscored: true,
      timestamps: true,
    }
  );

  return RenstraSubkegiatan;
};
