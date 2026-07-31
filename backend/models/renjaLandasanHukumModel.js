'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RenjaLandasanHukum extends Model {
    /**
     * Rangkai teks siap cetak untuk Bab I.2. Bila `teks_lengkap` sudah diisi
     * (mis. peraturan yang perlu menyebut perubahan/pencabutannya), teks itu
     * yang dipakai apa adanya.
     */
    teksCetak() {
      if (this.teks_lengkap && String(this.teks_lengkap).trim()) {
        return String(this.teks_lengkap).trim();
      }
      const label = RenjaLandasanHukum.LABEL_JENIS[this.jenis_produk] || '';
      const bagian = [label, this.nomor ? `Nomor ${this.nomor}` : null, this.tahun ? `Tahun ${this.tahun}` : null]
        .filter(Boolean)
        .join(' ');
      return bagian ? `${bagian} tentang ${this.judul}` : String(this.judul);
    }
  }

  RenjaLandasanHukum.LABEL_JENIS = {
    uu: 'Undang-Undang',
    perpu: 'Peraturan Pemerintah Pengganti Undang-Undang',
    pp: 'Peraturan Pemerintah',
    perpres: 'Peraturan Presiden',
    permendagri: 'Peraturan Menteri Dalam Negeri',
    permen_lain: 'Peraturan Menteri',
    kepmendagri: 'Keputusan Menteri Dalam Negeri',
    perda: 'Peraturan Daerah Provinsi Maluku Utara',
    pergub: 'Peraturan Gubernur Maluku Utara',
    lainnya: '',
  };

  RenjaLandasanHukum.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      // NULL = berlaku umum untuk semua perangkat daerah.
      kode_bidang_urusan: { type: DataTypes.STRING(10), allowNull: true },
      jenis_produk: {
        type: DataTypes.ENUM(
          'uu',
          'perpu',
          'pp',
          'perpres',
          'permendagri',
          'permen_lain',
          'kepmendagri',
          'perda',
          'pergub',
          'lainnya',
        ),
        allowNull: false,
        defaultValue: 'lainnya',
      },
      nomor: { type: DataTypes.STRING(60), allowNull: true },
      tahun: { type: DataTypes.STRING(4), allowNull: true },
      judul: { type: DataTypes.TEXT, allowNull: false },
      teks_lengkap: { type: DataTypes.TEXT, allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      berlaku_dari: { type: DataTypes.STRING(4), allowNull: true },
      berlaku_sampai: { type: DataTypes.STRING(4), allowNull: true },
      aktif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      perlu_verifikasi: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      catatan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'RenjaLandasanHukum',
      tableName: 'renja_landasan_hukum',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return RenjaLandasanHukum;
};
