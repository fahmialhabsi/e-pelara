'use strict';
const { AsetTetap } = require('../models');

// ISI DATA DARI KIB FISIK DINAS PANGAN
// Sumber: Laporan BMD/KIB dari Sekretariat
const asetRiil = [

  // ═══ PERALATAN DAN MESIN ═══
  // Contoh — ganti dengan data KIB yang sebenarnya:
  {
    kode_barang: '3.02.01.01.001', // Kode dari KIB
    nama_barang: 'Kendaraan Dinas Roda 4 (Toyota Fortuner)',
    kategori: 'PERALATAN_MESIN',
    harga_perolehan: 450000000,
    tahun_perolehan: 2019,
    tarif_penyusutan: 0.125, // 12,5%/tahun = umur 8 tahun
    kondisi: 'BAIK',
    status: 'AKTIF',
    lokasi: 'Kantor Dinas Pangan Provinsi Maluku Utara'
  },
  {
    kode_barang: '3.02.01.02.001',
    nama_barang: 'Laptop Lenovo ThinkPad',
    kategori: 'PERALATAN_MESIN',
    harga_perolehan: 18000000,
    tahun_perolehan: 2022,
    tarif_penyusutan: 0.25, // 25%/tahun = umur 4 tahun
    kondisi: 'BAIK',
    status: 'AKTIF',
    lokasi: 'Sekretariat'
  },

  // ═══ GEDUNG DAN BANGUNAN ═══
  {
    kode_barang: '3.03.01.01.001',
    nama_barang: 'Gedung Kantor Dinas Pangan',
    kategori: 'GEDUNG_BANGUNAN',
    harga_perolehan: 2500000000,
    tahun_perolehan: 2015,
    tarif_penyusutan: 0.05, // 5%/tahun = umur 20 tahun
    kondisi: 'BAIK',
    status: 'AKTIF',
    lokasi: 'Jl. Raya Sofifi'
  },

  // ═══ JALAN, IRIGASI, INSTALASI ═══
  // Tambahkan sesuai KIB...

  // ═══ ASET TETAP LAINNYA ═══
  // Tambahkan sesuai KIB...
];

async function main() {
  console.log('Input aset tetap riil...\n');
  let berhasil = 0, skip = 0;

  for (const aset of asetRiil) {
    // Idempoten: skip jika kode_barang sudah ada
    if (aset.kode_barang) {
      const existing = await AsetTetap.findOne({ where: { kode_barang: aset.kode_barang } });
      if (existing) { console.log('⏭  Skip:', aset.kode_barang, aset.nama_barang); skip++; continue; }
    }
    await AsetTetap.create(aset);
    console.log('✅', aset.kode_barang, aset.nama_barang, '- Rp', aset.harga_perolehan.toLocaleString('id-ID'));
    berhasil++;
  }

  console.log(`\nSelesai: ${berhasil} input, ${skip} skip`);
  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });