'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnPengisian extends Model {
    static associate(models) {
      ProsnPengisian.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnPengisian.belongsTo(models.ProsnIndikator, { foreignKey: 'indikator_id', as: 'indikator' });
      ProsnPengisian.belongsTo(models.User, { foreignKey: 'diisi_oleh', as: 'pengisi' });
      ProsnPengisian.hasMany(models.ProsnPemeriksaan, { foreignKey: 'pengisian_id', as: 'pemeriksaans' });
      ProsnPengisian.hasMany(models.ProsnRiwayatStatus, { foreignKey: 'pengisian_id', as: 'riwayatStatus' });
    }
  }

  ProsnPengisian.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    indikator_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('belum_diisi', 'dalam_pengisian', 'lengkap', 'perlu_perbaikan', 'siap_diinput_prosn', 'diinput_manual', 'diarsipkan'), allowNull: false, defaultValue: 'belum_diisi' },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    data_form: { type: DataTypes.JSON, allowNull: false },
    target_nilai: { type: DataTypes.DECIMAL(20, 4), allowNull: true },
    realisasi_nilai: { type: DataTypes.DECIMAL(20, 4), allowNull: true },
    rasio_nilai: { type: DataTypes.DECIMAL(9, 4), allowNull: true },
    satuan: { type: DataTypes.STRING(80), allowNull: true },
    sumber_data: { type: DataTypes.TEXT, allowNull: true },
    periode_data: { type: DataTypes.STRING(100), allowNull: true },
    hambatan: { type: DataTypes.TEXT, allowNull: true },
    tindak_lanjut: { type: DataTypes.TEXT, allowNull: true },
    diisi_oleh: { type: DataTypes.INTEGER, allowNull: true }, diisi_at: { type: DataTypes.DATE, allowNull: true },
    siap_input_oleh: { type: DataTypes.INTEGER, allowNull: true }, siap_input_at: { type: DataTypes.DATE, allowNull: true },
    input_manual_oleh: { type: DataTypes.INTEGER, allowNull: true }, input_manual_at: { type: DataTypes.DATE, allowNull: true },
    nomor_bukti_input: { type: DataTypes.STRING(150), allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true }, updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { sequelize, modelName: 'ProsnPengisian', tableName: 'prosnp_pengisian', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnPengisian;
};
