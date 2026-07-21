'use strict';

/**
 * Parser PDF "Laporan Realisasi per Sub Kegiatan" dari Aplikasi SIPD (Kemendagri) —
 * Menu Penatausahaan > Statistik Belanja. BEDA dengan PDF "Cetak RKA Rincian Belanja"
 * yang ditangani rkaSipdPdfImportService.js.
 *
 * PENTING — PDF ini TIDAK punya lapisan teks sama sekali (dikonfirmasi lewat operator
 * level: isinya cuma `paintImageXObject` + vector path, nol operator showText). Baik
 * `pdf-parse` maupun `pdfjs-dist` extractTextContent() mengembalikan 0 karakter. Jadi
 * TIDAK BISA dipakai regex teks-datar atau posisi-glyph PDF asli (beda dari RKA).
 * Satu-satunya jalan: render tiap halaman jadi gambar (pdfjs-dist + canvas), lalu OCR
 * (tesseract.js) dengan output word-level bounding box.
 *
 * Tantangan tabel: baris URAIAN yang panjang wrap 2-3 baris fisik, sementara KODE
 * REKENING + 12 angka Rp tetap 1 baris — baris angka itu SECARA VERTIKAL ada di
 * TENGAH rentang tinggi baris (row height = tinggi kolom URAIAN, yang paling
 * tinggi), bukan di baris teratas. Jadi tidak bisa dikelompokkan dengan "semua teks
 * sebelum baris angka berikutnya" — pendekatan yang dipakai di sini: cari baris
 * "anchor" (baris yang punya pola kode rekening + banyak nilai Rp), lalu setiap kata
 * URAIAN lain di-assign ke anchor TERDEKAT secara y (nearest-neighbor), baik itu di
 * atas maupun di bawah anchor-nya.
 *
 * Setiap baris SIPD punya 4 kolom realisasi (KKPD/UP-GU/TU/LS). Parser ini
 * mengembalikan satu baris SIPD sebagai satu objek `rincian`, lalu pemanggil
 * (controller) yang memecahnya jadi maksimal 4 baris Penatausahaan (satu per
 * jenis_transaksi yang nilainya > 0).
 *
 * PDF ini juga TIDAK mencantumkan tahun anggaran (hanya tanggal cetak pada
 * "Periode: dd Bulan yyyy"), jadi tahun WAJIB dikirim terpisah oleh pemanggil
 * (field `tahun` di form upload), bukan hasil parsing.
 */

const pdfParse = require('pdf-parse');
const { createCanvas } = require('canvas');
const Tesseract = require('tesseract.js');

// ~324 DPI dari base 72 DPI pdfjs. Sempat diuji di 3.0 (~216 DPI) — cukup utk
// sebagian besar baris, TAPI beberapa angka panjang (mis. "Rp13.500.000,00")
// kadang kehilangan 1 digit terdepan ("Rp3.500.000,00") pada resolusi itu,
// yg baru ketahuan lewat validasi silang Sisa Pagu = Pagu - Realisasi. Baik
// 4.5 tetap lebih lambat per-halaman tapi jauh lebih akurat utk data keuangan.
const RENDER_SCALE = 4.5;
const ROW_TOLERANCE_RUPIAH = 5; // toleransi selisih pembulatan/noise OCR saat validasi silang

// Ganti huruf yang sering ketukar OCR dengan digit yang mirip bentuknya KETIKA
// muncul di tengah/dalam sebuah token angka Rupiah (mis. "Rp0O,00" -> huruf O
// disangka nol kedua, harusnya "Rp00,00"="Rp0,00"). Tanpa ini, token seperti
// itu gagal dikenali sbg angka SAMA SEKALI oleh validasi lama, bukan cuma
// salah nilainya — dan baris yg satu Rp-nya "hilang" bikin SELURUH kolom di
// baris itu bergeser (nilai kolom lain jadi ikut salah semua).
function normalizeAngkaOcr(str) {
  return String(str || '')
    .replace(/[oO]/g, '0')
    .replace(/[lI]/g, '1')
    .replace(/[sS](?=[\d.,])/g, '5');
}

function parseRupiah(str) {
  if (!str) return 0;
  // Buang apa pun sebelum & termasuk "Rp" (case-insensitive), lalu normalisasi
  // huruf-mirip-digit, baru ambil substring numerik pertama. Tahan terhadap
  // noise huruf OCR di mana pun posisinya dalam token (bukan cuma di depan).
  const afterRp = String(str).replace(/^.*?Rp/i, '');
  const normalized = normalizeAngkaOcr(afterRp);
  const match = normalized.match(/\d[\d.,]*/);
  if (!match) return 0;
  const numeric = match[0].replace(/\./g, '').replace(',', '.');
  const n = Number(numeric);
  return Number.isFinite(n) ? n : 0;
}

function ambilLabel(text, label) {
  // Wajib diawali baris (^, flag m) supaya "KEGIATAN" tidak ikut cocok sbg
  // substring dari "SUB KEGIATAN" atau dari judul "LAPORAN ... SUB KEGIATAN".
  const re = new RegExp(`^${label}\\s*:?\\s*(.+)$`, 'im');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function pisahKodeNama(labelValue) {
  if (!labelValue) return { kode: null, nama: null };
  const parts = labelValue.split(/\s*-\s*/);
  const kode = parts[0].trim();
  const nama = parts.slice(1).join(' - ').trim();
  return { kode, nama };
}

// Perbaiki kode rekening yang kehilangan titik pertama akibat noise OCR, mis.
// OCR baca "51.02.01.01.0039" padahal aslinya "5.1.02.01.01.0039" (kode Belanja
// SIPD/BAS SELALU diawali "5.1."). Kalau sudah benar (sudah ada "5.1." di depan),
// dibiarkan apa adanya.
function normalizeKodeRekening(raw) {
  const s = String(raw || '').trim();
  if (/^5\.1\./.test(s)) return s;
  // Kode SIPD lengkap: 5.1.XX.XX.XX.XXXX (6 segmen: 5,1,XX,XX,XX,XXXX). Dua
  // pola noise OCR yang pernah ditemukan:
  // (a) titik pertama hilang -> "51.XX.XX.XX.XXXX" (5 segmen, "5" & "1" gabung)
  // (b) digit "1" hilang total -> "5..XX.XX.XX.XXXX" (titik dobel, "1" lenyap)
  const polaTitikGabung = s.match(/^51\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{4})$/);
  if (polaTitikGabung) {
    const [, a, b, c, d] = polaTitikGabung;
    return `5.1.${a}.${b}.${c}.${d}`;
  }
  const polaDigitHilang = s.match(/^5\.\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{4})$/);
  if (polaDigitHilang) {
    const [, a, b, c, d] = polaDigitHilang;
    return `5.1.${a}.${b}.${c}.${d}`;
  }
  return s;
}

function isKodeRekeningLike(text) {
  const s = String(text || '').trim();
  // Pola kode rekening SIPD: 5-6 kelompok digit dipisah titik, total >= 9 digit.
  if (!/^[\d.]{9,}$/.test(s)) return false;
  const digitGroups = s.split('.').filter(Boolean);
  return digitGroups.length >= 4;
}

function isRupiahLike(text) {
  // Sengaja LONGGAR (cuma cek awalan "Rp") — mensyaratkan seluruh sisa token
  // berupa digit/titik/koma murni (versi lama) membuat token yg kena noise
  // huruf DI TENGAH angka (mis. "Rp0O,00") gagal cocok SAMA SEKALI, sehingga
  // ikut ke-drop dari daftar rpWords dan bikin kolom lain di baris itu geser.
  // Di tabel ini "Rp" HANYA pernah muncul sbg awalan nominal, jadi aman.
  return /^Rp/i.test(String(text || '').trim());
}

async function renderPdfPageToPng(doc, pageNumber, scale = RENDER_SCALE) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toBuffer('image/png');
}

function collectWords(ocrData) {
  const words = [];
  (ocrData.blocks || []).forEach((block) => {
    (block.paragraphs || []).forEach((para) => {
      (para.lines || []).forEach((line) => {
        (line.words || []).forEach((w) => {
          const text = String(w.text || '').trim();
          if (!text) return;
          words.push({
            text,
            x0: w.bbox.x0,
            y0: w.bbox.y0,
            x1: w.bbox.x1,
            y1: w.bbox.y1,
            yc: (w.bbox.y0 + w.bbox.y1) / 2,
          });
        });
      });
    });
  });
  return words;
}

// Kelompokkan word jadi baris fisik berdasar kedekatan y (dipakai utk mendeteksi
// baris "anchor" yg punya kode rekening + banyak nilai Rp dalam SATU baris fisik).
function clusterIntoPhysicalLines(words, yTolerance = 12) {
  const sorted = [...words].sort((a, b) => a.yc - b.yc || a.x0 - b.x0);
  const lines = [];
  sorted.forEach((w) => {
    const last = lines[lines.length - 1];
    if (last && Math.abs(w.yc - last.yc) <= yTolerance) {
      last.words.push(w);
      last.yc = (last.yc * (last.words.length - 1) + w.yc) / last.words.length;
    } else {
      lines.push({ yc: w.yc, words: [w] });
    }
  });
  return lines;
}

// Ekstrak baris rincian dari SATU halaman (sudah di-OCR jadi words dgn bbox).
function extractRowsFromWords(words) {
  const physicalLines = clusterIntoPhysicalLines(words);

  // Anchor line = baris fisik yg punya >=1 kode-rekening-like word DAN >=6 word Rp-like.
  const anchors = [];
  physicalLines.forEach((line) => {
    const kodeWord = line.words.find((w) => isKodeRekeningLike(w.text));
    const rpWords = line.words.filter((w) => isRupiahLike(w.text));
    if (kodeWord && rpWords.length >= 6) {
      anchors.push({
        yc: line.yc,
        kode_rekening: normalizeKodeRekening(kodeWord.text),
        kodeX: kodeWord.x0,
        rpWords: rpWords.sort((a, b) => a.x0 - b.x0),
      });
    }
  });

  if (!anchors.length) return [];

  // Kolom URAIAN ada di antara kolom KODE REKENING dan kolom PAGU (nilai Rp
  // pertama tiap anchor) — dipakai utk membatasi word mana saja yg dianggap
  // bagian dari teks uraian, bukan noise dari kolom lain (mis. header/nomor).
  const kodeXs = anchors.map((a) => a.kodeX);
  const firstRpXs = anchors.map((a) => a.rpWords[0].x0);
  const uraianXMin = Math.max(...kodeXs) + 40;
  const uraianXMax = Math.min(...firstRpXs) - 20;

  // Batas atas/bawah y yg valid utk teks uraian — di luar rentang ini pasti
  // noise dari blok header (SUB SKPD/PROGRAM/dst di atas tabel) atau footer
  // (URL cetak di bawah tabel), BUKAN wrap uraian baris manapun. Tanpa batas
  // ini, nearest-neighbor akan tetap memaksa assign teks header/footer ke
  // anchor terdekat (biasanya baris pertama/terakhir) walau jaraknya jauh.
  const rowGaps = [];
  for (let i = 1; i < anchors.length; i += 1) rowGaps.push(anchors[i].yc - anchors[i - 1].yc);
  const typicalRowHeight = rowGaps.length
    ? rowGaps.slice().sort((a, b) => a - b)[Math.floor(rowGaps.length / 2)]
    : 80;
  const uraianYMin = anchors[0].yc - typicalRowHeight / 2;
  const uraianYMax = anchors[anchors.length - 1].yc + typicalRowHeight / 2;

  // Semua word LAIN (bukan bagian dari baris anchor manapun) yg jatuh di rentang
  // x kolom URAIAN -> assign ke anchor TERDEKAT secara y (nearest-neighbor),
  // supaya wrap URAIAN sebelum & sesudah baris angka tetap ke-gabung ke baris yg sama.
  const anchorWordSet = new Set();
  anchors.forEach((a) => {
    a.rpWords.forEach((w) => anchorWordSet.add(w));
  });

  const uraianWordsByAnchor = anchors.map(() => []);
  words.forEach((w) => {
    if (anchorWordSet.has(w)) return;
    if (isKodeRekeningLike(w.text)) return;
    if (w.x0 < uraianXMin || w.x0 > uraianXMax) return;
    if (w.yc < uraianYMin || w.yc > uraianYMax) return;
    if (/^[|.\-–—]+$/.test(w.text)) return; // border/separator noise
    if (/^\d{1,2}$/.test(w.text) && w.x0 < uraianXMin + 5) return; // sisa kolom NO yang meleset

    let nearestIdx = 0;
    let nearestDist = Infinity;
    anchors.forEach((a, idx) => {
      const dist = Math.abs(w.yc - a.yc);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });
    uraianWordsByAnchor[nearestIdx].push(w);
  });

  return anchors.map((a, idx) => {
    // PENTING: TIDAK cukup sort langsung (yc, x0) — dua kata yg SECARA VISUAL ada
    // di baris yg sama kadang dibaca Tesseract dgn yc berbeda 1-2px (jitter),
    // yg kalau dipakai langsung sbg kunci sort utama malah memecah satu baris
    // bacaan jadi dua "baris" semu dan mengacak urutan kata. Kelompokkan dulu
    // jadi sub-baris pakai toleransi yg sama dgn deteksi anchor, baru urutkan
    // sub-baris itu sendiri (atas ke bawah) dan kata di dalamnya (kiri ke kanan).
    const subLines = clusterIntoPhysicalLines(uraianWordsByAnchor[idx]).sort((p, q) => p.yc - q.yc);
    const uraian = subLines
      .map((line) => line.words.sort((p, q) => p.x0 - q.x0).map((w) => w.text).join(' '))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const angka = a.rpWords.slice(0, 12).map((w) => parseRupiah(w.text));
    while (angka.length < 12) angka.push(0);

    const [
      pagu, spdTerbit,
      rencanaKkpd, rencanaUpgu, rencanaTu, rencanaLs,
      realisasiKkpd, realisasiUpgu, realisasiTu, realisasiLs,
      sisaPagu, sisaSpd,
    ] = angka;

    const totalRealisasi = realisasiKkpd + realisasiUpgu + realisasiTu + realisasiLs;
    const selisihSisaPagu = Math.abs(sisaPagu - (pagu - totalRealisasi));
    const selisihSisaSpd = Math.abs(sisaSpd - (spdTerbit - totalRealisasi));
    const konsisten = selisihSisaPagu <= ROW_TOLERANCE_RUPIAH && selisihSisaSpd <= ROW_TOLERANCE_RUPIAH;

    return {
      kode_rekening: a.kode_rekening,
      uraian: uraian || '(uraian tidak terbaca)',
      pagu,
      spd_terbit: spdTerbit,
      realisasi: {
        KKPD: realisasiKkpd,
        UP_GU: realisasiUpgu,
        TU: realisasiTu,
        LS: realisasiLs,
      },
      sisa_pagu: sisaPagu,
      sisa_spd: sisaSpd,
      _validasi: {
        konsisten,
        selisih_sisa_pagu: selisihSisaPagu,
        selisih_sisa_spd: selisihSisaSpd,
      },
    };
  });
}

async function parseSipdRealisasiPdf(buffer) {
  // Header (SUB SKPD/PROGRAM/KEGIATAN/SUB KEGIATAN) dibaca dari pdf-parse KALAU PDF
  // punya lapisan teks (kompatibilitas ke depan bila SIPD suatu saat mengganti mesin
  // cetaknya) — kalau kosong (kasus umum saat ini), header diambil dari OCR halaman 1.
  let flatText = '';
  try {
    const data = await pdfParse(buffer);
    flatText = (data.text || '').replace(/\r/g, '');
  } catch (_) {
    flatText = '';
  }

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const worker = await Tesseract.createWorker('ind+eng');
  let allRincian = [];
  let headerOcrText = '';

  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const pngBuffer = await renderPdfPageToPng(doc, pageNum);
      const { data: ocrData } = await worker.recognize(pngBuffer, {}, { blocks: true, text: true });

      if (pageNum === 1) headerOcrText = ocrData.text || '';

      const words = collectWords(ocrData);
      const rows = extractRowsFromWords(words);
      allRincian = allRincian.concat(rows);
    }
  } finally {
    await worker.terminate();
  }

  const headerSource = flatText.trim().length > 20 ? flatText : headerOcrText;

  const subSkpd = ambilLabel(headerSource, 'SUB SKPD');
  const program = ambilLabel(headerSource, 'PROGRAM');
  const kegiatan = ambilLabel(headerSource, 'KEGIATAN');
  const subKegiatanRaw = ambilLabel(headerSource, 'SUB KEGIATAN');

  if (!subKegiatanRaw) {
    throw Object.assign(
      new Error(
        'Format PDF tidak dikenali: baris "SUB KEGIATAN" tidak ditemukan (baik dari teks PDF maupun hasil OCR). Pastikan file adalah cetakan "Laporan Realisasi per Sub Kegiatan" dari SIPD dan kualitas scan/cetakannya cukup jelas.',
      ),
      { status: 422 },
    );
  }

  const { kode: kodeSubKegiatan, nama: namaSubKegiatan } = pisahKodeNama(subKegiatanRaw);
  const { kode: kodeProgram } = pisahKodeNama(program);
  const { kode: kodeKegiatan } = pisahKodeNama(kegiatan);

  if (!allRincian.length) {
    throw Object.assign(
      new Error(
        'Tidak ada baris rincian rekening yang berhasil terbaca dari PDF ini (hasil OCR kosong). Kemungkinan kualitas cetakan/scan terlalu rendah — mohon cek manual atau unggah ulang dengan resolusi lebih baik.',
      ),
      { status: 422 },
    );
  }

  const totalPaguTerbaca = allRincian.reduce((s, r) => s + r.pagu, 0);
  const barisTidakKonsisten = allRincian.filter((r) => !r._validasi.konsisten);

  return {
    sub_skpd: subSkpd,
    kode_program: kodeProgram,
    kode_kegiatan: kodeKegiatan,
    kode_sub_kegiatan: kodeSubKegiatan,
    nama_sub_kegiatan: namaSubKegiatan,
    rincian: allRincian,
    _meta: {
      jumlah_baris_rincian: allRincian.length,
      total_pagu_terbaca: totalPaguTerbaca,
      jumlah_halaman: doc.numPages,
      baris_tidak_konsisten: barisTidakKonsisten.length,
      detail_baris_tidak_konsisten: barisTidakKonsisten.map((r) => ({
        kode_rekening: r.kode_rekening,
        uraian: r.uraian,
        selisih_sisa_pagu: r._validasi.selisih_sisa_pagu,
        selisih_sisa_spd: r._validasi.selisih_sisa_spd,
      })),
    },
  };
}

module.exports = { parseSipdRealisasiPdf, parseRupiah };
