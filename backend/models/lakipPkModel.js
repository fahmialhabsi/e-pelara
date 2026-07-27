'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LakipPk extends Model {
    static associate(models) {
      LakipPk.belongsTo(models.RenstraOPD, {
        foreignKey: 'renstra_id',
        as: 'renstra',
      });
      LakipPk.hasMany(models.LakipPkOutputSasaran, {
        foreignKey: 'lakip_pk_id',
        as: 'output_sasaran',
      });
      LakipPk.hasMany(models.LakipPkProgramAnggaran, {
        foreignKey: 'lakip_pk_id',
        as: 'program_anggaran',
      });
    }
  }

  LakipPk.init(
    {
      tahun: { type: DataTypes.INTEGER, allowNull: false },
      renstra_id: { type: DataTypes.INTEGER, allowNull: false },
      tanggal_ttd: { type: DataTypes.DATEONLY, allowNull: true },
      pihak_pertama_nama: { type: DataTypes.STRING(255), allowNull: true },
      pihak_pertama_jabatan: { type: DataTypes.STRING(255), allowNull: true },
      pasal1_tujuan: { type: DataTypes.TEXT, allowNull: true },
      pasal3_evaluasi: { type: DataTypes.TEXT, allowNull: true },
      pasal4_konsekuensi: { type: DataTypes.TEXT, allowNull: true },
      pasal5_larangan: { type: DataTypes.TEXT, allowNull: true },
      pasal5_etika: { type: DataTypes.TEXT, allowNull: true },
      pasal6_penutup: { type: DataTypes.TEXT, allowNull: true },
      target_serapan_anggaran: { type: DataTypes.STRING(50), allowNull: true },
      target_tl_bpk: { type: DataTypes.STRING(50), allowNull: true },
      target_ikm: { type: DataTypes.STRING(50), allowNull: true },
    },
    {
      sequelize,
      modelName: 'LakipPk',
      tableName: 'lakip_pk',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return LakipPk;
};
