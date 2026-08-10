'use strict';
const { Model } = require('sequelize');

/**
 * Evidence & Operasi Pangan — Phase 0 Foundation (mandat "Phase 0 — Foundation
 * / Shared Registry"). Registry dokumen/evidence generik, TERPISAH dari
 * `prosnp_bukti_dukung` (mandat §5/§72: pola versioning ProSN yang terbukti
 * — kelompok_uuid + versi + menggantikan_bukti_id — DIREUSE BENTUKNYA di
 * sini, TANPA menyentuh tabel/ENUM ProSN sama sekali).
 *
 * `document_class`/`document_type` sengaja module-owned (bukan FK ke
 * ProSN), sehingga daftar jenis dokumen dapat berkembang tanpa migrasi
 * ulang pada `prosnp_bukti_dukung.kategori` yang sudah live-production.
 */
module.exports = (sequelize, DataTypes) => {
  class FoodOpsDocument extends Model {
    static associate(models) {
      FoodOpsDocument.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      FoodOpsDocument.hasMany(models.FoodOpsDocumentLink, { foreignKey: 'document_id', as: 'links' });
      FoodOpsDocument.hasOne(models.FoodOpsRegulationMeta, { foreignKey: 'document_id', as: 'regulationMeta' });
      FoodOpsDocument.belongsTo(models.FoodOpsDocument, { foreignKey: 'menggantikan_document_id', as: 'versiSebelumnya' });
      FoodOpsDocument.hasMany(models.FoodOpsDocument, { foreignKey: 'menggantikan_document_id', as: 'versiBerikutnya' });
    }
  }

  FoodOpsDocument.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

    kelompok_uuid: { type: DataTypes.UUID, allowNull: false },
    versi: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    menggantikan_document_id: { type: DataTypes.INTEGER, allowNull: true },

    document_class: {
      type: DataTypes.ENUM('REGULATION', 'OPERATIONAL_EVIDENCE', 'ACTIVITY_DOCUMENT', 'REPORT', 'OTHER'),
      allowNull: false,
    },
    // Module-owned vocabulary (STRING, bukan ENUM tertutup) — daftar bisa
    // bertambah tanpa migrasi, divalidasi di service layer (foodOpsDocumentService).
    document_type: { type: DataTypes.STRING(50), allowNull: false },

    judul: { type: DataTypes.STRING(255), allowNull: false },
    nomor_dokumen: { type: DataTypes.STRING(150), allowNull: true },
    tanggal_dokumen: { type: DataTypes.DATEONLY, allowNull: true },
    penerbit: { type: DataTypes.STRING(255), allowNull: true },

    file_name_original: { type: DataTypes.STRING(255), allowNull: false },
    file_name_stored: { type: DataTypes.STRING(255), allowNull: false },
    file_path: { type: DataTypes.STRING(500), allowNull: false },
    file_url: { type: DataTypes.STRING(500), allowNull: true },

    mime_type: { type: DataTypes.STRING(150), allowNull: false },
    ukuran_byte: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    checksum_sha256: { type: DataTypes.STRING(64), allowNull: false },

    // Reuse vocabulary persis dari prosnp_bukti_dukung (mandat §7/§10) — TIDAK
    // FK/reference ke tabel ProSN, hanya nilai ENUM yang sama.
    status: { type: DataTypes.ENUM('aktif', 'perlu_perbaikan', 'digantikan', 'dibatalkan'), allowNull: false, defaultValue: 'aktif' },
    status_verifikasi: { type: DataTypes.ENUM('uploaded', 'valid', 'invalid', 'needs_clarification', 'duplicate', 'expired'), allowNull: false, defaultValue: 'uploaded' },

    extracted_text_cache: { type: DataTypes.TEXT, allowNull: true },
    extracted_at: { type: DataTypes.DATE, allowNull: true },
    extraction_method: { type: DataTypes.STRING(32), allowNull: true },
    klasifikasi_meta: { type: DataTypes.JSON, allowNull: true },

    // Mandat §8 — TIDAK boleh dikonflasi dengan status_verifikasi (itu bukti
    // sudah diperiksa manusia; ini menjawab "seberapa otoritatif sumbernya").
    authority_level: {
      type: DataTypes.ENUM('STRUCTURED_SYSTEM_SOURCE', 'SIGNED_UPLOAD', 'SYSTEM_GENERATED_DRAFT', 'SUPPORTING', 'TEST_DATA'),
      allowNull: true,
    },
    // Mandat §9 — dokumen upload asli boleh NULL; hanya diisi utk dokumen
    // hasil generate sistem, agar draft sistem TIDAK PERNAH tertukar dgn
    // dokumen resmi yang diunggah manusia (SIGNED_UPLOAD).
    generated_status: { type: DataTypes.ENUM('DRAFT', 'GENERATED', 'FINAL'), allowNull: true },

    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    sequelize, modelName: 'FoodOpsDocument', tableName: 'food_ops_document', underscored: true,
    timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  });

  return FoodOpsDocument;
};
