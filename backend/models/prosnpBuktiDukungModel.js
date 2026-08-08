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
    kategori: {
      type: DataTypes.ENUM(
        'surat_penugasan', 'keputusan_kdh', 'undangan', 'daftar_hadir', 'notulen', 'dokumentasi',
        'berita_acara', 'kartu_stok', 'dokumen_pengadaan', 'dokumen_penyaluran', 'rekonsiliasi',
        'perkada', 'bukti_implementasi', 'bukti_hasil', 'dpa', 'renja', 'rkpd',
        'bukti_tindak_lanjut', 'bukti_penerimaan', 'dokumen_penetapan', 'dokumen_koreksi', 'lainnya',
        'sk_satgas_mbg', 'bukti_aktivitas_satgas_mbg',
        'daftar_sarpras_mbg', 'bukti_ketersediaan_sarpras_mbg',
        'laporan_satgas_mbg', 'bukti_penyampaian_laporan_mbg',
        'dokumen_penetapan_sasaran_mbg', 'data_realisasi_penerima_mbg',
      ),
      allowNull: true,
    },
    status_verifikasi: { type: DataTypes.ENUM('uploaded', 'valid', 'invalid', 'needs_clarification', 'duplicate', 'expired'), allowNull: false, defaultValue: 'uploaded' },
    nomor_dokumen: { type: DataTypes.STRING(150), allowNull: true },
    tanggal_dokumen: { type: DataTypes.DATEONLY, allowNull: true },
    sumber: { type: DataTypes.STRING(150), allowNull: true },
    catatan_pemeriksa: { type: DataTypes.TEXT, allowNull: true },
    diperiksa_oleh: { type: DataTypes.INTEGER, allowNull: true },
    diperiksa_at: { type: DataTypes.DATE, allowNull: true },
    extracted_text_cache: { type: DataTypes.TEXT, allowNull: true },
    extracted_at: { type: DataTypes.DATE, allowNull: true },
    extraction_method: { type: DataTypes.STRING(32), allowNull: true },
    klasifikasi_meta: { type: DataTypes.JSON, allowNull: true },
  }, { sequelize, modelName: 'ProsnBuktiDukung', tableName: 'prosnp_bukti_dukung', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnBuktiDukung;
};
