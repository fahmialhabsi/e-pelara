'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnStokTransaksi extends Model {
    static associate(models) {
      ProsnStokTransaksi.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnStokTransaksi.belongsTo(models.ProsnPeriode, { foreignKey: 'periode_id', as: 'periode' });
      ProsnStokTransaksi.belongsTo(models.ProsnIndikator, { foreignKey: 'indikator_id', as: 'indikator' });
      ProsnStokTransaksi.belongsTo(models.ProsnPengisian, { foreignKey: 'pengisian_id', as: 'pengisian' });
      ProsnStokTransaksi.belongsTo(models.ProsnKomoditas, { foreignKey: 'komoditas_id', as: 'komoditas' });
    }
  }

  ProsnStokTransaksi.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    periode_id: { type: DataTypes.INTEGER, allowNull: false },
    indikator_id: { type: DataTypes.INTEGER, allowNull: false },
    pengisian_id: { type: DataTypes.INTEGER, allowNull: false },
    komoditas_id: { type: DataTypes.INTEGER, allowNull: false },
    tanggal: { type: DataTypes.DATEONLY, allowNull: false },
    jenis_transaksi: {
      type: DataTypes.ENUM('saldo_awal', 'pengadaan', 'penerimaan_lain_sah', 'penyaluran', 'susut_rusak', 'koreksi_masuk', 'koreksi_keluar'),
      allowNull: false,
    },
    volume: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    satuan: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Ton' },
    lokasi_gudang: { type: DataTypes.STRING(255), allowNull: true },
    pengelola: { type: DataTypes.STRING(150), allowNull: true },
    nomor_dokumen: { type: DataTypes.STRING(150), allowNull: true },
    sumber_data: { type: DataTypes.STRING(255), allowNull: true },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    ownership: { type: DataTypes.ENUM('pemerintah_provinsi', 'bulog', 'distributor', 'penggilingan', 'lainnya'), allowNull: false, defaultValue: 'pemerintah_provinsi' },
    status_verifikasi: { type: DataTypes.ENUM('uploaded', 'valid', 'invalid', 'needs_clarification', 'duplicate', 'expired'), allowNull: false, defaultValue: 'uploaded' },
    source_transaction_id: { type: DataTypes.INTEGER, allowNull: true },
    is_carry_forward: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { sequelize, modelName: 'ProsnStokTransaksi', tableName: 'prosnp_stok_transaksi', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnStokTransaksi;
};
