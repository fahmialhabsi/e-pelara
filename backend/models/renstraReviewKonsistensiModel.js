'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RenstraReviewKonsistensi extends Model {
    static associate(models) {
      RenstraReviewKonsistensi.belongsTo(models.RenstraOPD, {
        foreignKey: 'renstra_id',
        targetKey: 'id',
        as: 'renstra',
      });
    }
  }

  RenstraReviewKonsistensi.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      renstra_id: { type: DataTypes.INTEGER, allowNull: false },
      objek_level: {
        type: DataTypes.ENUM(
          'tujuan',
          'sasaran',
          'strategi',
          'arah_kebijakan',
          'program',
          'kegiatan',
          'sub_kegiatan',
        ),
        allowNull: false,
      },
      objek_id: { type: DataTypes.INTEGER, allowNull: false },
      objek_kode: DataTypes.STRING(60),
      objek_uraian: DataTypes.TEXT,
      jenis_rekomendasi: {
        type: DataTypes.ENUM(
          'pindahkan',
          'pecah',
          'gabungkan',
          'perbaiki_rumusan',
          'ganti_program',
          'sesuai',
        ),
        allowNull: false,
      },
      kondisi_saat_ini: DataTypes.TEXT,
      rekomendasi: { type: DataTypes.TEXT, allowNull: false },
      alasan_substansi: DataTypes.TEXT,
      dasar_hukum: DataTypes.JSON,
      usulan_parent_level: DataTypes.STRING(30),
      usulan_parent_id: DataTypes.INTEGER,
      parent_id_sebelum: DataTypes.INTEGER,
      sesuaikan_kode: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      kode_sebelum: DataTypes.STRING(60),
      tingkat_prioritas: {
        type: DataTypes.ENUM('tinggi', 'sedang', 'rendah'),
        allowNull: false,
        defaultValue: 'sedang',
      },
      status: {
        type: DataTypes.ENUM('usulan', 'disetujui', 'ditolak', 'ditindaklanjuti', 'selesai'),
        allowNull: false,
        defaultValue: 'usulan',
      },
      reviewer_nama: DataTypes.STRING(150),
      reviewer_jabatan: DataTypes.STRING(150),
      tanggal_review: DataTypes.DATEONLY,
      catatan_tindak_lanjut: DataTypes.TEXT,
      // true = teks ditulis manual oleh SUPER_ADMIN, sistem berhenti meregenerasi.
      catatan_manual: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      diterapkan_at: DataTypes.DATE,
      diterapkan_oleh: DataTypes.STRING(150),
    },
    {
      sequelize,
      modelName: 'RenstraReviewKonsistensi',
      tableName: 'renstra_review_konsistensi',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return RenstraReviewKonsistensi;
};
