"use strict";

/**
 * Crosswalk: kode_rekening APBD (Permendagri 84/2022, format "5.1.02.01.01.0024",
 * segmen: akun.kelompok.jenis.objek.rincian.sub_rincian di master_kode_rekening_belanja)
 * -> kode_akun_bas (BAS neraca/LRA/LO sederhana yang dipakai bkuJurnalService untuk posting jurnal).
 *
 * Hanya mencakup kelompok yang lazim muncul di SPJ per-OPD (Pegawai, Barang/Jasa, Modal).
 * Belanja Bunga/Subsidi/Hibah/Bansos biasanya diproses di level BUD/PPKD, bukan SPJ OPD,
 * jadi sengaja belum dipetakan — resolveKodeAkunBasFromRekening mengembalikan null untuk itu.
 */

const MAP_BARANG_JASA_OBJEK = {
  "01": "5.2.01", // Belanja Barang
  "02": "5.2.02", // Belanja Jasa
  "03": "5.2.03", // Belanja Pemeliharaan
  "04": "5.2.04", // Belanja Perjalanan Dinas
  "05": "5.2.06", // Belanja Uang/Jasa utk Pihak Ketiga/Pihak Lain/Masyarakat (aproksimasi)
};

const MAP_MODAL_JENIS = {
  "01": "5.3.01", // Belanja Modal Tanah
  "02": "5.3.02", // Belanja Modal Peralatan dan Mesin
  "03": "5.3.03", // Belanja Modal Gedung dan Bangunan
  "04": "5.3.04", // Belanja Modal Jalan, Jaringan, dan Irigasi
  "05": "5.3.05", // Belanja Modal Aset Tetap Lainnya
};

function resolveKodeAkunBasFromRekening(kodeRekening) {
  const seg = String(kodeRekening || "")
    .split(".")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  const [akun, kelompok, jenis, objek] = seg;

  if (akun !== "5") return null; // bukan segmen belanja

  if (kelompok === "1") {
    if (jenis === "01") return "5.1.01"; // Belanja Pegawai
    if (jenis === "02") return MAP_BARANG_JASA_OBJEK[objek] || null;
    return null;
  }
  if (kelompok === "2") {
    return MAP_MODAL_JENIS[jenis] || null;
  }
  return null;
}

module.exports = { resolveKodeAkunBasFromRekening };
