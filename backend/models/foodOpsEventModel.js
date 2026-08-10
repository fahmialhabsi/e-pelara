'use strict';
const { Model } = require('sequelize');

/**
 * Evidence & Operasi Pangan — Phase 0. Entitas kegiatan/aktivitas
 * operasional generik (mandat §16) — TERPISAH dari `prosnp_rapat_forkopimda`
 * (yang tetap B.1.2-owned/scoring-bound, TIDAK disentuh — mandat §52).
 * `event_type` module-owned, extensible (mandat §17), TIDAK meniru semantik
 * ProSN (mis. tidak ada is_forkopimda/topik_pengadaan dsb).
 */
module.exports = (sequelize, DataTypes) => {
  class FoodOpsEvent extends Model {
    static associate(models) {
      FoodOpsEvent.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    }
  }

  FoodOpsEvent.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    opd_id: { type: DataTypes.INTEGER, allowNull: true },

    tahun: { type: DataTypes.STRING(4), allowNull: false },
    // Module-owned, extensible vocabulary (mandat §17) — divalidasi service layer.
    event_type: { type: DataTypes.STRING(30), allowNull: false },

    tanggal_mulai: { type: DataTypes.DATEONLY, allowNull: false },
    tanggal_selesai: { type: DataTypes.DATEONLY, allowNull: true },
    nama_kegiatan: { type: DataTypes.STRING(255), allowNull: false },
    lokasi: { type: DataTypes.STRING(255), allowNull: true },
    pimpinan: { type: DataTypes.STRING(255), allowNull: true },
    penanggung_jawab: { type: DataTypes.STRING(255), allowNull: true },
    agenda: { type: DataTypes.TEXT, allowNull: true },
    hasil: { type: DataTypes.TEXT, allowNull: true },
    tindak_lanjut: { type: DataTypes.TEXT, allowNull: true },
    // Reuse vocabulary persis dari ProSN B.1.1/B.1.2 (mandat §18) — bukan FK/reference.
    status_tindak_lanjut: { type: DataTypes.ENUM('belum_ditindaklanjuti', 'sedang_diproses', 'selesai'), allowNull: false, defaultValue: 'belum_ditindaklanjuti' },
    // Lifecycle record itu sendiri (bukan tindak lanjut) — soft-cancel, tidak hard-delete.
    status: { type: DataTypes.ENUM('aktif', 'dibatalkan'), allowNull: false, defaultValue: 'aktif' },

    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    sequelize, modelName: 'FoodOpsEvent', tableName: 'food_ops_event', underscored: true,
    timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  });

  return FoodOpsEvent;
};
