// File: backend/helpers/rkaCalculationHelper.js

'use strict';

const { normalizeRincianBelanja } = require('./rkaNormalizePayload');
const { validateRincianBelanja } = require('./rkaRincianValidator');

/**
 * Memproses rincian belanja menjadi data siap simpan ke database.
 *
 * Yang dihitung otomatis:
 * - Volume hasil (perkalian seluruh koefisien)
 * - Jumlah
 * - Nilai PPN
 * - Total setelah PPN
 * - Total anggaran sub kegiatan
 *
 * @param {Array} rincianBelanjaArray
 * @returns {{
 *   processedRincian: Array,
 *   totalAnggaranSubKegiatan: number
 * }}
 */
function processRincianBelanja(rincianBelanjaArray = []) {
  const rincian = normalizeRincianBelanja(rincianBelanjaArray);
  validateRincianBelanja(rincian);
  const rincianItem = rincian.filter((item) => item.kode_rekening && !item.is_group);

  if (!rincianItem.length) {
    return {
      processedRincian: [],
      totalAnggaranSubKegiatan: 0,
    };
  }

  let totalAnggaranSubKegiatan = 0;

  const processedRincian = rincianItem.map((item, idx) => {
    const koefisien = Array.isArray(item.koefisien_array) ? item.koefisien_array : [];

    // ===========================
    // Hitung volume hasil
    // ===========================

    // Volume 0 pada salah satu komponen koefisien itu SAH dan HARUS membuat total
    // baris jadi 0 (mis. "0 Orang x 2 Kali" pada RKA yang belum diisi anggarannya
    // di SIPD). Jangan pakai `|| 1`/`vol > 0 ? vol : 1` — itu diam-diam menganggap
    // 0 sbg "netral" (dikalikan seolah 1), sehingga total ikut salah walau
    // koefisiennya benar 0 (harga_satuan tetap ikut dikalikan penuh).
    const volumeHasil = koefisien.reduce((hasil, current) => {
      const vol = Number(current.volume ?? 1);

      return hasil * vol;
    }, 1);

    // ===========================
    // Harga satuan
    // ===========================

    const hargaSatuan = Number(item.harga_satuan || 0);

    // ===========================
    // Jumlah sebelum PPN
    // ===========================

    const jumlah = volumeHasil * hargaSatuan;

    // ===========================
    // PPN
    // ===========================

    const ppn = Number(item.ppn) > 0 ? Number(item.ppn) : 0;

    const nilaiPPN = (jumlah * ppn) / 100;

    const totalSetelahPPN = jumlah + nilaiPPN;

    // ===========================
    // Total anggaran
    // ===========================

    totalAnggaranSubKegiatan += totalSetelahPPN;

    // ===========================
    // Bentuk teks satuan
    // ===========================

    const satuanGabungan =
      koefisien
        .map((k) => String(k.satuan || '').trim())
        .filter((s) => s.length > 0)
        .join(' x ') || String(item.satuan || '').trim();

    return {
      urutan: Number(item.urutan) || idx + 1,

      kode_rekening: item.kode_rekening,
      nama_rekening: item.nama_rekening || null,

      uraian: item.uraian,
      spesifikasi: item.spesifikasi || null,

      volume: volumeHasil,
      volume_hasil: volumeHasil,

      satuan: satuanGabungan,

      harga_satuan: hargaSatuan,

      jumlah,

      ppn,

      nilai_ppn: nilaiPPN,

      total_setelah_ppn: totalSetelahPPN,

      sumber_dana: item.sumber_dana || null,

      lokasi: item.lokasi || null,

      keterangan: item.keterangan || null,

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
