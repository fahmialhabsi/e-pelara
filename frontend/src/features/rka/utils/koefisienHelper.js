/**
 * ============================================================================
 * koefisienHelper.js
 * ----------------------------------------------------------------------------
 * Helper utilitas Koefisien SIPD
 *
 * Tujuan:
 * - Menghitung volume hasil dari koefisien_array
 * - Membentuk teks koefisien seperti SIPD
 * - Menyiapkan struktur koefisien default
 *
 * CATATAN:
 * File ini tidak bergantung pada React maupun Ant Design.
 * Aman digunakan oleh Form, Print, Export maupun Dashboard.
 * ============================================================================
 */

/**
 * Membuat struktur koefisien default.
 */
export function createDefaultKoefisien(satuan = 'unit') {
  return [
    {
      volume: 1,
      satuan: String(satuan || 'unit').trim(),
    },
  ];
}

/**
 * Membersihkan isi koefisien.
 */
export function normalizeKoefisien(koefisienArray) {
  if (!Array.isArray(koefisienArray) || koefisienArray.length === 0) {
    return createDefaultKoefisien();
  }

  return koefisienArray.map((item) => ({
    volume: Number(item?.volume) || 1,
    satuan: String(item?.satuan || 'unit').trim(),
  }));
}

/**
 * Menghitung hasil perkalian seluruh volume.
 *
 * Contoh:
 * 2 Orang
 * x
 * 5 Hari
 * x
 * 12 Bulan
 *
 * =
 * 120
 */
export function hitungVolumeHasil(koefisienArray) {
  const data = normalizeKoefisien(koefisienArray);

  return data.reduce((hasil, item) => hasil * (Number(item.volume) || 1), 1);
}

/**
 * Menghasilkan teks koefisien seperti SIPD.
 *
 * Contoh:
 *
 * 2 Orang x 5 Hari x 12 Bulan
 */
export function formatKoefisien(koefisienArray) {
  const data = normalizeKoefisien(koefisienArray);

  return data.map((item) => `${item.volume} ${item.satuan}`).join(' x ');
}

/**
 * Menghasilkan teks satuan gabungan.
 *
 * Contoh:
 *
 * Orang x Hari x Bulan
 */
export function formatSatuanGabungan(koefisienArray) {
  const data = normalizeKoefisien(koefisienArray);

  return data.map((item) => item.satuan).join(' x ');
}

/**
 * Menghitung jumlah belanja.
 *
 * volume_hasil × harga_satuan
 */
export function hitungJumlah(volumeHasil, hargaSatuan) {
  return (Number(volumeHasil) || 0) * (Number(hargaSatuan) || 0);
}

/**
 * Menambahkan satu baris koefisien.
 */
export function tambahKoefisien(koefisienArray) {
  const data = normalizeKoefisien(koefisienArray);

  return [
    ...data,
    {
      volume: 1,
      satuan: 'unit',
    },
  ];
}

/**
 * Menghapus satu baris koefisien.
 */
export function hapusKoefisien(koefisienArray, index) {
  const data = normalizeKoefisien(koefisienArray);

  const hasil = data.filter((_, i) => i !== index);

  return hasil.length ? hasil : createDefaultKoefisien();
}

/**
 * Mengubah salah satu field koefisien.
 */
export function updateKoefisien(koefisienArray, index, field, value) {
  const data = normalizeKoefisien(koefisienArray);

  data[index] = {
    ...data[index],
    [field]:
      field === 'volume'
        ? value === '' || value === null || Number.isNaN(Number(value))
          ? 1
          : Number(value)
        : String(value ?? '').trim(),
  };

  return data;
}
