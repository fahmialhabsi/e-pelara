'use strict';

function validateRincianBelanja(rows = []) {
  const errors = [];

  // Nilai PPN yang diizinkan sesuai ketentuan saat ini
  const allowedPPN = [0, 11, 12];

  rows.forEach((item, index) => {
    // Lewati baris group/hierarchy
    if (item.is_group === true) {
      return;
    }

    const row = index + 1;

    // ==========================
    // Kode Rekening
    // ==========================

    if (!item.kode_rekening) {
      errors.push(`Baris ${row}: kode rekening wajib diisi.`);
    } else {
      const kode = String(item.kode_rekening).trim();

      if (!/^[0-9.]+$/.test(kode)) {
        errors.push(`Baris ${row}: format kode rekening tidak valid.`);
      }
    }

    // ==========================
    // Nama Rekening
    // ==========================

    const namaRekening = String(item.nama_rekening || '').trim();

    if (!namaRekening) {
      errors.push(`Baris ${row}: nama rekening wajib diisi.`);
    }

    if (namaRekening.length > 255) {
      errors.push(`Baris ${row}: nama rekening terlalu panjang.`);
    }

    // ==========================
    // Uraian
    // ==========================

    const uraian = String(item.uraian || '').trim();

    if (!uraian) {
      errors.push(`Baris ${row}: uraian wajib diisi.`);
    }

    if (uraian.length > 1000) {
      errors.push(`Baris ${row}: uraian tidak boleh lebih dari 1000 karakter.`);
    }

    // ==========================
    // Koefisien
    // ==========================

    if (!Array.isArray(item.koefisien_array)) {
      errors.push(`Baris ${row}: koefisien wajib berupa array.`);
    } else {
      if (item.koefisien_array.length === 0) {
        errors.push(`Baris ${row}: minimal memiliki 1 koefisien.`);
      }

      if (item.koefisien_array.length > 10) {
        errors.push(`Baris ${row}: jumlah koefisien maksimal 10.`);
      }

      item.koefisien_array.forEach((k, idx) => {
        const volume = Number(k.volume);

        // Volume 0 sah (RKA yang belum diisi anggarannya di SIPD tampil "0,00" di
        // semua kolom) — hanya nilai negatif/non-angka yang ditolak, konsisten dgn
        // schema Joi rkaValidationService (`volume: Joi.number().min(0)`).
        if (!Number.isFinite(volume) || volume < 0) {
          errors.push(`Baris ${row}: volume koefisien ke-${idx + 1} tidak boleh minus.`);
        }

        if (!String(k.satuan || '').trim()) {
          errors.push(`Baris ${row}: satuan koefisien ke-${idx + 1} wajib diisi.`);
        }
      });
    }

    // ==========================
    // Harga Satuan
    // ==========================

    const rawHarga = item.harga_satuan;

    if (rawHarga === '' || rawHarga === null || rawHarga === undefined) {
      errors.push(`Baris ${row}: harga satuan wajib diisi.`);
    } else {
      const harga = Number(rawHarga);

      if (!Number.isFinite(harga)) {
        errors.push(`Baris ${row}: harga satuan tidak valid.`);
      }

      if (harga < 0) {
        errors.push(`Baris ${row}: harga satuan tidak boleh negatif.`);
      }

      if (harga > 1000000000000) {
        errors.push(`Baris ${row}: harga satuan melebihi batas yang diizinkan.`);
      }
    }

    // ==========================
    // PPN
    // ==========================

    const ppn = Number(item.ppn ?? 0);

    if (!allowedPPN.includes(ppn)) {
      errors.push(`Baris ${row}: nilai PPN tidak valid.`);
    }
  });

  // ==========================
  // Throw Error jika ada
  // ==========================

  if (errors.length) {
    const err = new Error('Validasi rincian belanja gagal.');
    err.status = 400;
    err.details = errors;
    throw err;
  }
}

module.exports = {
  validateRincianBelanja,
};
