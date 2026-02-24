// src/utils/kodeUtils.js

/**
 * Menghasilkan kode unik berdasarkan prefix dan data list eksisting.
 *
 * @param {Object} options
 * @param {string} options.prefix - Awalan kode, misal 'RKPD3-2'
 * @param {Array} options.dataList - List data yang berisi kode eksisting
 * @param {string} [options.field="kode"] - Nama field kode (misal: 'kode_indikator', 'nomor_spd')
 * @param {number} [options.padding=2] - Jumlah digit untuk nomor urut, default 2 (jadi 01, 02, dst)
 * @returns {string} Kode unik yang baru
 */
export function generateKode({
  prefix,
  dataList,
  field = "kode",
  padding = 2,
}) {
  const count = dataList.filter((item) =>
    item[field]?.startsWith(prefix)
  ).length;
  const nextNumber = String(count + 1).padStart(padding, "0");
  return `${prefix}.${nextNumber}`;
}
