// backend/scripts/crop-band-images-v2.js
// Crop presisi banner_header.png & banner_footer.png berdasarkan hasil
// analisis piksel (Y start/end sudah diketahui pasti, bukan tebakan).
// Jalankan: node scripts/crop-band-images-v2.js

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../assets');

const jobs = [
  { file: 'banner_header.png', top: 18, height: 1068, targetWidth: 1400 },
  { file: 'banner_footer.png', top: 1059, height: 829, targetWidth: 1400 },
];

(async () => {
  for (const job of jobs) {
    const inputPath = path.join(assetsDir, job.file);
    const backupPath = path.join(assetsDir, job.file.replace('.png', '.original.png'));

    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath);
    }

    const meta = await sharp(inputPath).metadata();
    const tempOutputPath = path.join(assetsDir, job.file.replace('.png', '.cropped.png'));

    await sharp(inputPath)
      .extract({ left: 0, top: job.top, width: meta.width, height: job.height })
      .resize({ width: job.targetWidth, withoutEnlargement: true })
      .png({ quality: 82, compressionLevel: 9, palette: true })
      .toFile(tempOutputPath);

    fs.renameSync(tempOutputPath, inputPath);

    const newSize = fs.statSync(inputPath).size;
    const newMeta = await sharp(inputPath).metadata();
    console.log(
      `✅ ${job.file}: dipotong presisi → ${newMeta.width}x${newMeta.height} ` +
        `(${(newSize / 1024).toFixed(0)}KB, rasio ${(newMeta.width / newMeta.height).toFixed(2)}:1, ` +
        `backup asli: ${path.basename(backupPath)})`,
    );
  }
  console.log('\n✨ Selesai. Lanjut terapkan patch controller di bawah.');
})();
