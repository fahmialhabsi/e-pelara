'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnInovasi extends Model {
    static associate(models) {
      ProsnInovasi.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnInovasi.belongsTo(models.ProsnPeriode, { foreignKey: 'periode_id', as: 'periode' });
      ProsnInovasi.belongsTo(models.ProsnIndikator, { foreignKey: 'indikator_id', as: 'indikator' });
      ProsnInovasi.belongsTo(models.ProsnPengisian, { foreignKey: 'pengisian_id', as: 'pengisian' });
    }
  }

  ProsnInovasi.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    periode_id: { type: DataTypes.INTEGER, allowNull: false },
    indikator_id: { type: DataTypes.INTEGER, allowNull: false },
    pengisian_id: { type: DataTypes.INTEGER, allowNull: false },
    nama_inovasi: { type: DataTypes.STRING(255), allowNull: false },
    masalah_awal: { type: DataTypes.TEXT, allowNull: true },
    tujuan: { type: DataTypes.TEXT, allowNull: true },
    unsur_kebaruan: { type: DataTypes.TEXT, allowNull: true },
    proses_sebelum: { type: DataTypes.TEXT, allowNull: true },
    proses_setelah: { type: DataTypes.TEXT, allowNull: true },
    ruang_lingkup: { type: DataTypes.TEXT, allowNull: true },
    relevansi_pengadaan: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    relevansi_pengelolaan: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    relevansi_penyaluran: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    relevansi_umum: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    tanggal_mulai: { type: DataTypes.DATEONLY, allowNull: true },
    status_implementasi: { type: DataTypes.ENUM('gagasan', 'diterapkan_sebagian', 'diterapkan_penuh'), allowNull: false, defaultValue: 'gagasan' },
    unit_pelaksana: { type: DataTypes.STRING(255), allowNull: true },
    lokasi: { type: DataTypes.STRING(255), allowNull: true },
    penerima_manfaat: { type: DataTypes.TEXT, allowNull: true },
    hasil_kuantitatif: { type: DataTypes.TEXT, allowNull: true },
    hasil_kualitatif: { type: DataTypes.TEXT, allowNull: true },
    sub_kegiatan_basis: { type: DataTypes.STRING(255), allowNull: true },
    status_evaluasi: { type: DataTypes.STRING(150), allowNull: true },
    status_perkada: { type: DataTypes.ENUM('belum_ada', 'proses_penyusunan', 'ditetapkan'), allowNull: false, defaultValue: 'belum_ada' },
    jenis_perkada: { type: DataTypes.STRING(100), allowNull: true },
    nomor_perkada: { type: DataTypes.STRING(150), allowNull: true },
    tanggal_perkada: { type: DataTypes.DATEONLY, allowNull: true },
    relevansi_dijelaskan: { type: DataTypes.TEXT, allowNull: true },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    provenance: { type: DataTypes.JSON, allowNull: true },
  }, { sequelize, modelName: 'ProsnInovasi', tableName: 'prosnp_inovasi', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnInovasi;
};
