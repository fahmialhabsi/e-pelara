// backend/scripts/analyze-band-images.js
// Analisis berbasis WARNA (bukan alpha) — karena transparansi asli ternyata
// sudah ter-flatten jadi pola kotak-kotak putih/abu biasa saat export.
// Mencari baris piksel dimana konten hijau-emas (saturasi tinggi) mulai & berakhir.
// Jalankan: node scripts/analyze-band-images.js

const sharp = require('sharp');
const path = require('path');

const files = ['6.original.png', '7.original.png'];
const assetsDir = path.join(__dirname, '../assets');

async function analyze(filename) {
  const inputPath = path.join(assetsDir, filename);
  const img = sharp(inputPath);
  const { width, height } = await img.metadata();
  const { data } = await img.raw().toBuffer({ resolveWithObject: true }); // RGB, tanpa alpha

  const SATURATION_THRESHOLD = 25; // makin tinggi selisih R/G/B, makin "berwarna" (bukan putih/abu)
  const ROW_FRACTION_THRESHOLD = 0.04; // baris dianggap "berisi" kalau >4% pikselnya berwarna

  let firstContentRow = null;
  let lastContentRow = null;

  for (let y = 0; y < height; y++) {
    let colorfulCount = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const r = data[idx],
        g = data[idx + 1],
        b = data[idx + 2];
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (sat > SATURATION_THRESHOLD) colorfulCount++;
    }
    const fraction = colorfulCount / width;
    if (fraction > ROW_FRACTION_THRESHOLD) {
      if (firstContentRow === null) firstContentRow = y;
      lastContentRow = y;
    }
  }

  console.log(`\n📐 ${filename} (canvas: ${width}x${height})`);
  if (firstContentRow === null) {
    console.log('   ⚠️  Tidak ada baris dengan konten berwarna signifikan ditemukan.');
    return;
  }
  const contentHeight = lastContentRow - firstContentRow;
  console.log(
    `   Konten hijau/emas mulai di Y=${firstContentRow}, berakhir di Y=${lastContentRow}`,
  );
  console.log(`   Tinggi area konten: ${contentHeight}px dari total ${height}px`);
  console.log(`   Rasio setelah crop: ${(width / contentHeight).toFixed(2)}:1`);
}

(async () => {
  for (const f of files) {
    await analyze(f);
  }
})();
