'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnBuktiDukung extends Model {
    static associate(models) {
      ProsnBuktiDukung.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnBuktiDukung.belongsTo(models.ProsnPeriode, { foreignKey: 'periode_id', as: 'periode' });
      ProsnBuktiDukung.belongsTo(models.ProsnBuktiDukung, { foreignKey: 'menggantikan_bukti_id', as: 'versiSebelumnya' });
      ProsnBuktiDukung.hasMany(models.ProsnBuktiDukung, { foreignKey: 'menggantikan_bukti_id', as: 'versiBerikutnya' });
      ProsnBuktiDukung.belongsToMany(models.ProsnIndikator, { through: models.ProsnBuktiIndikator, foreignKey: 'bukti_dukung_id', otherKey: 'indikator_id', as: 'indikators' });
    }
  }

  ProsnBuktiDukung.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }, periode_id: { type: DataTypes.INTEGER, allowNull: false },
    kelompok_uuid: { type: DataTypes.UUID, allowNull: false }, versi: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    judul: { type: DataTypes.STRING(255), allowNull: false }, jenis_bukti: { type: DataTypes.STRING(80), allowNull: true },
    nama_asli: { type: DataTypes.STRING(255), allowNull: false }, nama_tersimpan: { type: DataTypes.STRING(255), allowNull: false }, file_path: { type: DataTypes.STRING(500), allowNull: false }, file_url: { type: DataTypes.STRING(500), allowNull: true }, mime_type: { type: DataTypes.STRING(150), allowNull: false }, ukuran_byte: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false }, checksum_sha256: { type: DataTypes.STRING(64), allowNull: false },
    status: { type: DataTypes.ENUM('aktif', 'perlu_perbaikan', 'digantikan', 'dibatalkan'), allowNull: false, defaultValue: 'aktif' }, lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, menggantikan_bukti_id: { type: DataTypes.INTEGER, allowNull: true }, catatan: { type: DataTypes.TEXT, allowNull: true }, diunggah_oleh: { type: DataTypes.INTEGER, allowNull: false }, diunggah_at: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize, modelName: 'ProsnBuktiDukung', tableName: 'prosnp_bukti_dukung', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnBuktiDukung;
};
