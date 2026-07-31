'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RenstraProgram extends Model {
    static associate(models) {
      RenstraProgram.belongsTo(models.RenstraOPD, {
        foreignKey: 'renstra_id',
        targetKey: 'id',
        as: 'renstra',
      });

      RenstraProgram.belongsTo(models.Program, {
        foreignKey: 'rpjmd_program_id',
        targetKey: 'id',
        as: 'program_rpjmd',
      });

      RenstraProgram.hasMany(models.RenstraKegiatan, {
        foreignKey: 'program_id',
        as: 'kegiatans',
      });

      RenstraProgram.hasMany(models.IndikatorRenstra, {
        foreignKey: 'ref_id',
        constraints: false,
        scope: { stage: 'program' },
        as: 'indikators',
      });

      RenstraProgram.hasMany(models.RenstraTabelProgram, {
        foreignKey: 'program_id',
        as: 'tabelPrograms',
      });

      RenstraProgram.belongsTo(models.PrioritasNasional, {
        foreignKey: 'prioritas_nasional_id',
        targetKey: 'id',
        as: 'prioritasNasional',
      });

      RenstraProgram.belongsTo(models.PrioritasDaerah, {
        foreignKey: 'prioritas_daerah_id',
        targetKey: 'id',
        as: 'prioritasDaerah',
      });

      RenstraProgram.belongsTo(models.PrioritasGubernur, {
        foreignKey: 'prioritas_kepala_daerah_id',
        targetKey: 'id',
        as: 'prioritasGubernur',
      });
    }
  }

  RenstraProgram.init(
    {
      kode_program: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nama_program: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      opd_penanggung_jawab: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      bidang_opd_penanggung_jawab: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      kebijakan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      rpjmd_program_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Penanda dukungan Program terhadap prioritas berjenjang (opsional) —
      // ditambahkan supaya Renja Bab V (Permendagri 14/2026) bisa menyajikan
      // Program Prioritas Nasional/Daerah/Gubernur konsisten lintas tahun,
      // bukan ditandai ulang tiap tahun di level item RKPD seperti sebelumnya.
      prioritas_nasional_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      prioritas_daerah_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      prioritas_kepala_daerah_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'RenstraProgram',
      tableName: 'renstra_program',
      underscored: true,
      timestamps: false,
    },
  );

  return RenstraProgram;
};
