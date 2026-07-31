'use strict';

/**
 * Optimasi berkas pita header/footer Renja 14/2026 (dari tim desain, lihat
 * SUMBER di bawah untuk nama file terbaru) menjadi versi ringkas di
 * assets/branding/. Jalankan ulang skrip ini setiap kali file sumbernya
 * diganti dengan versi baru.
 *
 * Kenapa perlu: berkas sumber pernah berukuran 3780x1890 (colorType truecolor)
 * — kalau ditanam apa adanya ke PDF, SATU dokumen 55+ halaman bisa membengkak
 * jadi >6MB meski PDFKit sudah menanamnya cuma sekali (dicache lewat
 * openImage()). Palet warna dibatasi (256 warna) karena pita ini flat-color +
 * ilustrasi sederhana, cukup tajam tanpa perlu truecolor, dan hasilnya jauh
 * lebih ringan (~1600px lebar sudah lebih dari cukup untuk cetak 150dpi).
 *
 * Pemakaian: node scripts/optimizePitaAssets.js
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Nama berkas sumber berubah tiap kali tim desain kirim revisi baru — riwayat:
// 6.png/7.png (revisi 1) -> 9.png/10.png (revisi 2, dipakai sekarang). Kalau
// diganti lagi, cukup update dua baris path di bawah ini.
const SUMBER = [
  { src: 'assets/9.png', dst: 'assets/branding/pita-header-pangan.png' },
  { src: 'assets/10.png', dst: 'assets/branding/pita-footer-pangan.png' },
];

async function main() {
  for (const { src, dst } of SUMBER) {
    const srcPath = path.join(__dirname, '..', src);
    const dstPath = path.join(__dirname, '..', dst);
    if (!fs.existsSync(srcPath)) {
      console.warn(`Lewati (tidak ditemukan): ${src}`);
      continue;
    }
    await sharp(srcPath)
      .resize({ width: 1200 })
      .png({ compressionLevel: 9, palette: true })
      .toFile(dstPath);
    const before = fs.statSync(srcPath).size;
    const after = fs.statSync(dstPath).size;
    console.log(`${src} (${(before / 1024).toFixed(0)} KB) -> ${dst} (${(after / 1024).toFixed(0)} KB)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
