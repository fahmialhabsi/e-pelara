'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnSuratPenugasan extends Model {
    static associate(models) {
      ProsnSuratPenugasan.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnSuratPenugasan.belongsTo(models.ProsnPeriode, { foreignKey: 'periode_id', as: 'periode' });
      ProsnSuratPenugasan.belongsTo(models.ProsnIndikator, { foreignKey: 'indikator_id', as: 'indikator' });
      ProsnSuratPenugasan.belongsTo(models.ProsnPengisian, { foreignKey: 'pengisian_id', as: 'pengisian' });
      ProsnSuratPenugasan.belongsTo(models.PerangkatDaerah, { foreignKey: 'opd_penerima_id', as: 'opdPenerima' });
      ProsnSuratPenugasan.hasMany(models.ProsnSuratPenugasanDukungan, { foreignKey: 'surat_penugasan_id', as: 'dukungan' });
    }
  }

  ProsnSuratPenugasan.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    periode_id: { type: DataTypes.INTEGER, allowNull: false },
    indikator_id: { type: DataTypes.INTEGER, allowNull: false },
    pengisian_id: { type: DataTypes.INTEGER, allowNull: false },
    nomor_surat: { type: DataTypes.STRING(150), allowNull: false },
    tanggal_surat: { type: DataTypes.DATEONLY, allowNull: false },
    bulan: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    jenis_dokumen: { type: DataTypes.STRING(150), allowNull: true },
    pejabat_penandatangan: { type: DataTypes.STRING(150), allowNull: false },
    opd_penerima_id: { type: DataTypes.INTEGER, allowNull: true },
    opd_penerima_nama: { type: DataTypes.STRING(255), allowNull: true },
    unit_pelaksana: { type: DataTypes.STRING(255), allowNull: true },
    tanggal_mulai_berlaku: { type: DataTypes.DATEONLY, allowNull: true },
    tanggal_berakhir: { type: DataTypes.DATEONLY, allowNull: true },
    ringkasan_isi: { type: DataTypes.TEXT, allowNull: false },
    cakupan_pengadaan: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    cakupan_pengelolaan: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    cakupan_penyaluran: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status_tindak_lanjut: { type: DataTypes.ENUM('belum_ditindaklanjuti', 'sedang_diproses', 'selesai'), allowNull: false, defaultValue: 'belum_ditindaklanjuti' },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    provenance: { type: DataTypes.JSON, allowNull: true },
  }, { sequelize, modelName: 'ProsnSuratPenugasan', tableName: 'prosnp_surat_penugasan', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnSuratPenugasan;
};
