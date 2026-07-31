// backend/scripts/compress-band-images.js
// Jalankan sekali: node scripts/compress-band-images.js
// Mengecilkan resolusi + kompresi 6.png & 7.png (band header/footer) yang asalnya
// besar (8-9MB), ke ukuran wajar untuk band setipis ~50-64px di layar/cetak.

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const files = [
  { name: '6.png', targetWidth: 1600 }, // header band
  { name: '7.png', targetWidth: 1600 }, // footer band
];

const assetsDir = path.join(__dirname, '../assets');

async function compressOne(filename, targetWidth) {
  const inputPath = path.join(assetsDir, filename);
  const backupPath = path.join(assetsDir, filename.replace('.png', '.original.png'));
  const tempOutputPath = path.join(assetsDir, filename.replace('.png', '.compressed.png'));

  if (!fs.existsSync(inputPath)) {
    console.warn(`⚠️  ${filename} tidak ditemukan di ${assetsDir}, dilewati.`);
    return;
  }

  const originalSize = fs.statSync(inputPath).size;

  // Simpan cadangan file asli (sekali saja, tidak menimpa backup yang sudah ada)
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
  }

  await sharp(inputPath)
    .trim({ threshold: 10 }) // potong otomatis area transparan/kosong di tepi gambar
    .resize({ width: targetWidth, withoutEnlargement: true })
    .png({ quality: 80, compressionLevel: 9, palette: true })
    .toFile(tempOutputPath);

  const newSize = fs.statSync(tempOutputPath).size;

  // Timpa file asli dengan hasil kompresi
  fs.renameSync(tempOutputPath, inputPath);

  const newMeta = await sharp(inputPath).metadata();
  console.log(
    `✅ ${filename}: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(newSize / 1024).toFixed(0)}KB` +
      ` | dimensi baru: ${newMeta.width}x${newMeta.height} (rasio ${(newMeta.width / newMeta.height).toFixed(2)}:1)` +
      ` (backup asli tersimpan di ${path.basename(backupPath)})`,
  );
}

(async () => {
  console.log('🔧 Mengompres gambar band header/footer...\n');
  for (const f of files) {
    await compressOne(f.name, f.targetWidth);
  }
  console.log('\n✨ Selesai. Restart server backend, lalu generate ulang dokumen.');
})();
