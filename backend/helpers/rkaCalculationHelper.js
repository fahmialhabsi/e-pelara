// File: helpers/rkaCalculationHelper.js

/**
 * Memproses array rincian belanja untuk menghitung volume kumulatif,
 * teks satuan gabungan, dan total nominal per baris rekening.
 * * @param {Array} rincianBelanjaArray - Array rincian belanja dari client
 * @returns {Object} { processedRincian, totalAnggaranSubKegiatan }
 */
function processRincianBelanja(rincianBelanjaArray) {
  if (!Array.isArray(rincianBelanjaArray) || rincianBelanjaArray.length === 0) {
    return { processedRincian: [], totalAnggaranSubKegiatan: 0 };
  }

  let totalAnggaranSubKegiatan = 0;

  const processedRincian = rincianBelanjaArray.map((item, idx) => {
    const koefisien = item.koefisien_array || [];

    // 1. Hitung total volume dengan mengalikan semua volume di dalam koefisien_array
    // Contoh: 5 orang x 2 hari x 12 bulan = 120
    const totalVolumeItem = koefisien.reduce((acc, current) => {
      const vol = Number(current.volume);
      return acc * (isNaN(vol) || vol <= 0 ? 1 : vol);
    }, 1);

    // 2. Hitung total jumlah harga per item rekening
    const totalJumlahItem = totalVolumeItem * Number(item.harga_satuan || 0);

    // 3. Gabungkan teks satuan secara otomatis untuk kompatibilitas struktur data lama
    // Contoh hasil: "5 Orang x 2 Hari x 12 Bulan"
    const teksSatuanGabungan = koefisien.map((k) => `${k.volume} ${k.satuan}`).join(' x ');

    totalAnggaranSubKegiatan += totalJumlahItem;

    return {
      kode_rekening: item.kode_rekening,
      nama_rekening: item.nama_rekening || null,
      uraian: item.uraian,
      harga_satuan: Number(item.harga_satuan),
      volume: totalVolumeItem,
      satuan: teksSatuanGabungan,
      jumlah: totalJumlahItem,
      sumber_dana: item.sumber_dana,
      lokasi: item.lokasi || null,
      keterangan: item.keterangan || null,
      // Simpan bentuk aslinya sebagai string JSON di DB anak
      koefisien_array: JSON.stringify(koefisien),
    };
  });

  return {
    processedRincian,
    totalAnggaranSubKegiatan,
  };
}

module.exports = {
  processRincianBelanja,
};
