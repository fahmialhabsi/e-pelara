'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RenstraTabelSasaran extends Model {
    static associate(models) {
      // Relasi ke model indikator (opsional)
      RenstraTabelSasaran.belongsTo(models.IndikatorRenstra, {
        foreignKey: 'indikator_id',
        as: 'indikator',
      });

      RenstraTabelSasaran.belongsTo(models.Sasaran, {
        foreignKey: 'sasaran_id',
        targetKey: 'id',
        as: 'sasaran_rpjmd',
      });
    }
  }

  RenstraTabelSasaran.init(
    {
      renstra_id: DataTypes.INTEGER,
      tujuan_id: DataTypes.INTEGER,
      sasaran_id: DataTypes.INTEGER,
      strategi_id: DataTypes.INTEGER,
      indikator_id: DataTypes.INTEGER,
      baseline: DataTypes.FLOAT,
      satuan_target: DataTypes.STRING(100),
      target_tahun_1: DataTypes.FLOAT,
      target_tahun_2: DataTypes.FLOAT,
      target_tahun_3: DataTypes.FLOAT,
      target_tahun_4: DataTypes.FLOAT,
      target_tahun_5: DataTypes.FLOAT,
      target_tahun_6: DataTypes.FLOAT,
      pagu_tahun_1: DataTypes.DECIMAL(20, 2),
      pagu_tahun_2: DataTypes.DECIMAL(20, 2),
      pagu_tahun_3: DataTypes.DECIMAL(20, 2),
      pagu_tahun_4: DataTypes.DECIMAL(20, 2),
      pagu_tahun_5: DataTypes.DECIMAL(20, 2),
      pagu_tahun_6: DataTypes.DECIMAL(20, 2),
      lokasi: DataTypes.STRING(255),
      kode_sasaran: DataTypes.STRING(50),
      nama_sasaran: DataTypes.STRING(255),
      target_akhir_renstra: DataTypes.DECIMAL(10, 0),
      pagu_akhir_renstra: DataTypes.DECIMAL(20, 2),
      pagu_rpjmd_acuan: DataTypes.DECIMAL(20, 2),
      versi: DataTypes.INTEGER,
      status_revisi: DataTypes.STRING(20),
      last_revised_at: DataTypes.DATE,
      last_revised_by: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'RenstraTabelSasaran',
      tableName: 'renstra_tabel_sasaran',
      underscored: true,
      timestamps: true, // gunakan createdAt dan updatedAt
    },
  );

  return RenstraTabelSasaran;
};
