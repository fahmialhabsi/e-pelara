function normalizeRincianBelanja(rows = []) {
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((item) => item && item.is_group !== true)
    .map((item) => ({
      ...item,

      harga_satuan: Number(item.harga_satuan || 0),

      ppn: Number(item.ppn || 0),

      koefisien_array: Array.isArray(item.koefisien_array)
        ? item.koefisien_array.map((k) => ({
            volume: Number(k.volume || 1),
            satuan: String(k.satuan || '').trim(),
          }))
        : [],
    }));
}

module.exports = {
  normalizeRincianBelanja,
};
