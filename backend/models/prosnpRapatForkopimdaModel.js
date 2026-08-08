'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnRapatForkopimda extends Model {
    static associate(models) {
      ProsnRapatForkopimda.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnRapatForkopimda.belongsTo(models.ProsnPeriode, { foreignKey: 'periode_id', as: 'periode' });
      ProsnRapatForkopimda.belongsTo(models.ProsnIndikator, { foreignKey: 'indikator_id', as: 'indikator' });
      ProsnRapatForkopimda.belongsTo(models.ProsnPengisian, { foreignKey: 'pengisian_id', as: 'pengisian' });
    }
  }

  ProsnRapatForkopimda.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    periode_id: { type: DataTypes.INTEGER, allowNull: false },
    indikator_id: { type: DataTypes.INTEGER, allowNull: false },
    pengisian_id: { type: DataTypes.INTEGER, allowNull: false },
    tanggal_rapat: { type: DataTypes.DATEONLY, allowNull: false },
    bulan: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    nama_forum: { type: DataTypes.STRING(255), allowNull: false },
    jenis_forum: { type: DataTypes.STRING(150), allowNull: true },
    is_forkopimda: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    pimpinan_rapat: { type: DataTypes.STRING(150), allowNull: true },
    lokasi: { type: DataTypes.STRING(255), allowNull: true },
    unsur_forkopimda_hadir: { type: DataTypes.JSON, allowNull: true },
    instansi_lain_hadir: { type: DataTypes.TEXT, allowNull: true },
    topik_pengadaan: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    topik_pengelolaan: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    topik_penyaluran: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    agenda: { type: DataTypes.TEXT, allowNull: true },
    masalah: { type: DataTypes.TEXT, allowNull: true },
    keputusan: { type: DataTypes.TEXT, allowNull: true },
    tindak_lanjut: { type: DataTypes.TEXT, allowNull: true },
    penanggung_jawab_tindak_lanjut: { type: DataTypes.STRING(150), allowNull: true },
    batas_waktu_tindak_lanjut: { type: DataTypes.DATEONLY, allowNull: true },
    status_tindak_lanjut: { type: DataTypes.ENUM('belum_ditindaklanjuti', 'sedang_diproses', 'selesai'), allowNull: false, defaultValue: 'belum_ditindaklanjuti' },
    sub_kegiatan_pendukung: { type: DataTypes.STRING(255), allowNull: true },
    materi: { type: DataTypes.TEXT, allowNull: true },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    provenance: { type: DataTypes.JSON, allowNull: true },
  }, { sequelize, modelName: 'ProsnRapatForkopimda', tableName: 'prosnp_rapat_forkopimda', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnRapatForkopimda;
};
