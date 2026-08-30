'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnBuktiIndikator extends Model {
    static associate(models) {
      ProsnBuktiIndikator.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnBuktiIndikator.belongsTo(models.ProsnBuktiDukung, { foreignKey: 'bukti_dukung_id', as: 'buktiDukung' });
      ProsnBuktiIndikator.belongsTo(models.ProsnIndikator, { foreignKey: 'indikator_id', as: 'indikator' });
      ProsnBuktiIndikator.belongsTo(models.ProsnPengisian, { foreignKey: 'pengisian_id', as: 'pengisian' });
      ProsnBuktiIndikator.belongsTo(models.User, { foreignKey: 'ditautkan_oleh', as: 'ditautkanOleh' });
    }
  }

  ProsnBuktiIndikator.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    bukti_dukung_id: { type: DataTypes.INTEGER, allowNull: false },
    indikator_id: { type: DataTypes.INTEGER, allowNull: false },
    pengisian_id: { type: DataTypes.INTEGER, allowNull: true },
    entity_type: {
      type: DataTypes.ENUM(
        'SURAT_PENUGASAN', 'RAPAT_FORKOPIMDA', 'CADANGAN_TARGET', 'STOK_TRANSAKSI',
        'INOVASI', 'PENGISIAN', 'SATGAS_MBG', 'LAPORAN_SATGAS_MBG',
      ),
      allowNull: true,
    },
    entity_id: { type: DataTypes.INTEGER, allowNull: true },
    relevansi: { type: DataTypes.TEXT, allowNull: true },
    checklist_status: { type: DataTypes.ENUM('belum_dicek', 'sesuai', 'tidak_sesuai'), allowNull: false, defaultValue: 'belum_dicek' },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    catatan_kekurangan: { type: DataTypes.TEXT, allowNull: true },
    ditautkan_oleh: { type: DataTypes.INTEGER, allowNull: true },
  }, { sequelize, modelName: 'ProsnBuktiIndikator', tableName: 'prosnp_bukti_indikator', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnBuktiIndikator;
};
