'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnSuratPenugasanDukungan extends Model {
    static associate(models) {
      ProsnSuratPenugasanDukungan.belongsTo(models.ProsnSuratPenugasan, { foreignKey: 'surat_penugasan_id', as: 'suratPenugasan' });
    }
  }

  ProsnSuratPenugasanDukungan.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    surat_penugasan_id: { type: DataTypes.INTEGER, allowNull: false },
    kode_sub_kegiatan: { type: DataTypes.STRING(50), allowNull: true },
    program: { type: DataTypes.STRING(255), allowNull: true },
    kegiatan: { type: DataTypes.STRING(255), allowNull: true },
    sub_kegiatan: { type: DataTypes.STRING(255), allowNull: true },
    indikator_output: { type: DataTypes.TEXT, allowNull: true },
    target: { type: DataTypes.STRING(150), allowNull: true },
    pagu: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
    realisasi: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
    sumber_id: { type: DataTypes.STRING(100), allowNull: true },
    sumber_jenis: { type: DataTypes.ENUM('dpa', 'renja', 'rkpd', 'manual'), allowNull: false, defaultValue: 'manual' },
  }, { sequelize, modelName: 'ProsnSuratPenugasanDukungan', tableName: 'prosnp_surat_penugasan_dukungan', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnSuratPenugasanDukungan;
};
