'use strict';

/**
 * Mesin dokumen resmi Renja Perangkat Daerah — sistematika Permendagri 14/2026
 * (6 bab + Tabel 4.1 landscape 18 kolom).
 *
 * Terpisah dari planningOfficialDocumentEngine.js yang melayani Permendagri
 * 86/2017 dan RKPD. Pemilihannya dilakukan di berkas tersebut berdasarkan
 * kolom renja_dokumen.regulasi_acuan.
 *
 * Helper tata letak, tabel markdown, dan kepala dokumen dipakai ulang apa
 * adanya; yang benar-benar baru hanya Tabel 4.1 karena susunan kolom dan
 * kepala tabelnya berbeda sama sekali dari versi 86/2017.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  TableLayoutType,
  PageBreak,
  PageNumber,
  Footer,
  TableOfContents,
  HeadingLevel,
  ImageRun,
  ShadingType,
  HeightRule,
  VerticalAlign,
  SequentialIdentifier,
} = require('docx');

const {
  addPortrait,
  addLandscape,
  nextPortrait,
  usableWidth,
  leftMargin,
  topMargin,
} = require('../helpers/RenjaPdfLayoutHelper');
const { drawPdfGridTable, renderMarkdownToPdf } = require('../helpers/RenjaPdfTableHelper');
const { PDF_THEME } = require('../helpers/RenjaPdfThemeHelper');
const {
  lebarKolom,
  lebarKolomPersen,
  kepalaTabel,
  barisTabel,
  selBaris,
  barisPenomoran,
  BARIS_TEBAL,
} = require('../helpers/Permendagri14Bab4TableHelper');
const { generateBabPermendagri14 } = require('./permendagri14/renjaBabGeneratorService');
const { recalcDpaRealisasi } = require('./dpaRealisasiRollupService');
const { recalcLkDispang } = require('./lkDispangRollupService');

/** Penanda tempat Tabel 4.1 disisipkan di dalam narasi Bab IV. */
const PENANDA_TABEL = '[TABEL_4_1]';

const JUDUL_BAB = [
  ['bab1', 'BAB I — PENDAHULUAN'],
  ['bab2', 'BAB II — HASIL EVALUASI RENJA PERANGKAT DAERAH TAHUN LALU'],
  ['bab3', 'BAB III — TUJUAN DAN SASARAN PERANGKAT DAERAH'],
  ['bab4', 'BAB IV — RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH'],
  ['bab5', 'BAB V — KINERJA PENYELENGGARAAN BIDANG URUSAN'],
  ['bab6', 'BAB VI — PENUTUP'],
];

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** Palet warna cover — hijau tema Ketahanan Pangan + aksen emas instansional. */
/** Palet "Government Editorial" — navy institusional + emerald (tema
 * ketahanan pangan) + gold sebagai aksen tipis, menggantikan palet hijau
 * tunggal lama. Diterapkan 2026-08-02 atas persetujuan user terhadap mockup
 * arah desain (lihat percakapan) — dipakai konsisten untuk sampul, judul
 * Bab, subbab, dan header tabel di seluruh dokumen. */
const WARNA_COVER = {
  NAVY: '#10293D',
  NAVY_SOFT: '#1B3A52',
  EMERALD: '#0C6B4F',
  EMAS: '#B8922F',
  PUTIH: '#F4F1E8',
};

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'branding', 'logo-maluku-utara.jpeg');
let LOGO_BUFFER = null;
try {
  LOGO_BUFFER = fs.readFileSync(LOGO_PATH);
} catch {
  LOGO_BUFFER = null;
}

/** Sampul jadi (desain siap pakai dari tim, bukan digambar ulang) — dipakai
 * penuh 1 halaman A4; jatuh balik ke sampul vektor kalau berkasnya tidak ada. */
const COVER_IMAGE_PATH = path.join(
  __dirname,
  '..',
  'assets',
  'branding',
  'cover-renja-dinas-pangan-2027.png',
);
let COVER_IMAGE_BUFFER = null;
try {
  COVER_IMAGE_BUFFER = fs.readFileSync(COVER_IMAGE_PATH);
} catch {
  COVER_IMAGE_BUFFER = null;
}

/** Baca lebar/tinggi PNG langsung dari chunk IHDR (offset tetap 16/20), tanpa
 * dependensi paket luar — cukup untuk kebutuhan hitung rasio gambar sampul. */
function dimensiPng(buffer) {
  if (!buffer || buffer.length < 24) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const COVER_IMAGE_DIM = dimensiPng(COVER_IMAGE_BUFFER);

/** Halaman potret isi dokumen dibuat POLOS (tanpa banner/lencana/garis hias
 * header-footer) — sudah dicoba banner ilustrasi penuh (memakan ±42% tinggi
 * halaman, bikin dokumen 59→70 halaman) lalu versi ringkas lencana+garis
 * aksen, tapi user tetap minta polos. Margin kembali ke 40pt standar semua
 * sisi, sama seperti modul 86/2017. Nomor halaman tetap ada lewat
 * stempelNomorHalaman() di akhir proses render. */
function nextPortraitBerpita(pdf) {
  nextPortrait(pdf);
}

/** Jarak antar baris paragraf (opsional) — dipakai supaya modul 14/2026 bisa
 * pakai spacing lebih longgar tanpa mengubah renderMarkdownToPdf bagi modul
 * 86/2017 yang memanggilnya tanpa opts (default tetap seperti sebelumnya). */
const PDF_LINE_GAP = 3.5;
const DOCX_LINE_SPACING = 360; // 1,5x (satuan 240/baris)

/** Header tabel modul ini pakai navy tema institusional (bukan biru pucat
 * bawaan PDF_THEME, yang tetap dipertahankan apa adanya untuk modul 86/2017). */
const HEADER_TABEL_PDF = { headerFill: WARNA_COVER.NAVY, headerText: '#FFFFFF' };
const HEADER_TABEL_DOCX = '10293D';

/** Pola baris judul subbab ("2.1 ...") dan judul tabel ("Tabel 2.1 ..."), dipakai
 * bersama oleh pelacak halaman PDF (Daftar Isi/Daftar Tabel) dan render DOCX
 * (heading level 2 / caption Word) supaya kedua format konsisten. */
const SUBBAB_REGEX = /^\d+\.\d+\s+\S/;
const TABEL_CAPTION_REGEX = /^Tabel\s+\d+\.\d+\s+\S/;

/** Tabel 2.4 (11 kolom, T-C.29) & Tabel 2.5 (14 kolom, SPM/Pelayanan) terlalu
 * padat di potret — kolomnya jadi sangat sempit dan header terpecah tidak
 * karuan; keduanya dirender di halaman landscape lewat
 * renderBabTerlacak({ landscapeUntukTabel }). Nomornya mengikuti penomoran di
 * renjaBabGeneratorService.js — kalau tabel Bab II ditambah/dikurangi lagi,
 * regex ini WAJIB disesuaikan ulang. */
const TABEL_LEBAR_BAB2 = /^Tabel 2\.[45]\b/;

function formatBulanTahun(tanggal) {
  const d = tanggal instanceof Date ? tanggal : new Date(tanggal);
  if (Number.isNaN(d.getTime())) return '';
  return `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Ambil pejabat penandatangan (Kepala Dinas) untuk Kata Pengantar. Mundur ke
 * tahun sebelumnya jika data tahun berjalan belum diisi (mis. dokumen Renja
 * tahun mendatang dibuat sebelum data pejabat tahun itu di-input).
 */
async function ambilPejabatKepalaDinas(db, tahun) {
  const { PejabatPenandatangan } = db;
  if (!PejabatPenandatangan) return null;
  for (const t of [Number(tahun), Number(tahun) - 1, Number(tahun) - 2]) {
    const row = await PejabatPenandatangan.findOne({ where: { tahun: t, role: 'KEPALA_DINAS' } });
    if (row && row.nama && row.nama !== '-') return row;
  }
  return null;
}

/** Baca gambar tanda tangan/cap elektronik milik pejabat sendiri dari folder
 * uploads (URL disimpan via menu Setting Pejabat Penandatangan, dengan
 * gerbang persetujuan_pemilik di controller). Mengembalikan null kalau
 * kolomnya kosong atau berkasnya sudah tidak ada — dokumen tetap jatuh balik
 * ke placeholder nama/NIP seperti sebelumnya, tidak pernah gagal generate
 * hanya karena gambar tidak ditemukan. */
function muatGambarPejabat(url) {
  if (!url) return null;
  try {
    const namaBerkas = String(url).replace(/^\/?uploads\//, '');
    return fs.readFileSync(path.join(__dirname, '..', 'uploads', namaBerkas));
  } catch {
    return null;
  }
}

/** BUG KRITIS (ditemukan 2026-08-01 dari analisis file .docx hasil generate
 * nyata): paket docx v9.6.1 memakai `options.type` LANGSUNG sebagai
 * ekstensi file media (`${hash}.${options.type}`) — TIDAK auto-deteksi dari
 * isi buffer seperti PDFKit. Setiap `new ImageRun(...)` di file ini WAJIB
 * menyertakan `type: "png"/"jpg"/"gif"/"bmp"` eksplisit sesuai format
 * berkasnya — kalau tidak, media tersimpan dengan ekstensi "*.undefined"
 * TANPA entri di [Content_Types].xml, membuat Word menganggap paketnya
 * rusak (dialog "konten tidak dapat dibaca") dan gambar hilang. Gambar
 * TTD/cap selalu dinormalisasi ke PNG oleh `sharp` sebelum sampai ke
 * ImageRun (lihat siapkanGambarTandaTanganDocx), jadi type-nya selalu
 * "png" — tidak perlu deteksi dari nama berkas asli lagi. Cover & Logo pakai
 * type hardcode sesuai berkas asetnya masing-masing (lihat pemanggilannya). */

/** Ukuran & posisi tumpang tindih cap+TTD — SAMA PERSIS dengan versi PDF
 * (lihat renderTandaTanganPdf) supaya kedua format konsisten. Diperbesar &
 * ditumpangkan lebih dalam (rasioTumpang naik dari 0.55 -> 0.78) atas
 * permintaan user (2026-08-02, contoh dokumen fisik asli): sebelumnya cap
 * & TTD cuma bersinggungan tipis di ujung, sekarang coretan tanda tangan
 * benar-benar melintasi badan cap, meniru dokumen fisik yang ditandatangani
 * langsung di atas stempel. */
const TTD_LAYOUT = { tinggiPt: 70, lebarTtdPt: 105, lebarCapPt: 90, rasioTumpang: 0.78 };

/** BUG (ditemukan 2026-08-02 dari analisis file .docx nyata): `ImageRun`
 * docx.js mengalikan `transformation.width`/`height` dengan 9525 EMU —
 * yaitu EMU-per-PIKSEL (96 DPI), BUKAN EMU-per-POIN. Nilai TTD_LAYOUT di
 * atas dalam satuan poin (dipakai apa adanya oleh PDFKit yang memang
 * berbasis poin), jadi kalau dioper langsung ke ImageRun tanpa dikonversi,
 * gambar tercetak 75% (72/96) dari ukuran seharusnya — bukan gambar hilang,
 * tapi lebih kecil dari yang dimaksud. 96/72 di sini mengonversi poin -> piksel. */
const PT_KE_PX_DOCX = 96 / 72;

/** BUG (dilaporkan user 2026-08-02, terlihat dari 2 berkas asli yang
 * diunggah): tanda tangan & cap yang diunggah pengguna TERNYATA berlatar
 * PUTIH POLOS (bukan PNG transparan seperti asumsi awal). Kalau langsung
 * ditumpuk, latar putih cap yang OPAQUE menutupi total bagian tanda tangan
 * di zona tumpang tindih — bukannya menyatu, malah saling menimpa/memutus
 * garis TTD. Fungsi ini "menghapus" latar putih dengan mengunci piksel yang
 * mendekati putih murni jadi transparan (alpha=0), sehingga hanya guratan
 * tinta (biru/hitam) yang tersisa opaque — cocok untuk tanda tangan/cap
 * hasil pindai/tulis-digital yang khas berupa garis warna gelap di atas
 * kertas/kanvas putih. */
async function hapusLatarPutih(buffer) {
  const gambar = sharp(buffer).ensureAlpha();
  const { data, info } = await gambar.raw().toBuffer({ resolveWithObject: true });
  const AMBANG_PUTIH = 235; // R,G,B semuanya di atas ini dianggap "latar", bukan tinta
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] >= AMBANG_PUTIH && data[i + 1] >= AMBANG_PUTIH && data[i + 2] >= AMBANG_PUTIH) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer();
}

/** Muat & bersihkan (hapus latar putih) gambar TTD/cap pejabat — DIPAKAI
 * BERSAMA oleh PDF (renderTandaTanganPdf) dan DOCX (siapkanGambarTandaTanganDocx)
 * supaya keduanya konsisten. Sebelumnya hanya jalur DOCX yang dibersihkan
 * latar putihnya; PDF masih pakai buffer mentah — aman selama tumpang
 * tindihnya tipis, tapi begitu rasioTumpang diperbesar (2026-08-02, permintaan
 * user meniru dokumen fisik), latar putih TTD yang OPAQUE akan menutupi cap
 * di PDF juga kalau tidak dibersihkan sama seperti DOCX. */
async function siapkanGambarBersihTtdCap(pejabat) {
  const tandaTanganBufferAsli = muatGambarPejabat(pejabat?.tanda_tangan_url);
  const capBufferAsli = muatGambarPejabat(pejabat?.cap_dinas_url);
  const [tandaTanganBuffer, capBuffer] = await Promise.all([
    tandaTanganBufferAsli ? hapusLatarPutih(tandaTanganBufferAsli) : null,
    capBufferAsli ? hapusLatarPutih(capBufferAsli) : null,
  ]);
  return { tandaTanganBuffer, capBuffer };
}

/** Gabungkan cap + tanda tangan jadi SATU gambar PNG (cap menumpuk sebagian
 * TTD, meniru dokumen fisik) sebelum disisipkan ke Word — permintaan user
 * (2026-08-01): di Word, cap & TTD tampil terpisah berdampingan, padahal
 * seharusnya tumpang tindih seperti di PDF. Penyebabnya: docx.js menaruh
 * gambar inline berurutan (tidak bisa diberi koordinat bebas seperti
 * pdf.image()), jadi dua ImageRun terpisah TIDAK BISA saling menumpuk di
 * Word tanpa positioning "floating" yang rumit dan tidak selalu konsisten
 * antar-versi Word. Solusinya: gabungkan dulu jadi satu gambar via `sharp`
 * (composite di server), baru disisipkan sebagai SATU ImageRun — hasilnya
 * identik dengan versi PDF, dan jauh lebih andal daripada floating image.
 *
 * Dipanggil SEKALI di awal buildRenjaPermendagri14Docx (bukan di dalam
 * tandaTanganParagraphsDocx yang dipanggil 2x/dipanggil dalam forEach yang
 * tidak mendukung await) — hasilnya dioper sebagai parameter.
 */
async function siapkanGambarTandaTanganDocx(pejabat) {
  const { tandaTanganBuffer, capBuffer } = await siapkanGambarBersihTtdCap(pejabat);
  if (!tandaTanganBuffer && !capBuffer) return null;

  const SKALA = 4; // pt -> px, cukup tajam untuk cetak
  const { tinggiPt, lebarTtdPt, lebarCapPt, rasioTumpang } = TTD_LAYOUT;
  const tinggiPx = tinggiPt * SKALA;
  const transparan = { r: 0, g: 0, b: 0, alpha: 0 };

  try {
    if (tandaTanganBuffer && capBuffer) {
      const lebarCapPx = lebarCapPt * SKALA;
      const lebarTtdPx = lebarTtdPt * SKALA;
      const tumpangPx = Math.round(lebarCapPt * rasioTumpang * SKALA);
      const totalLebarPx = lebarCapPx + lebarTtdPx - tumpangPx;

      const [capResize, ttdResize] = await Promise.all([
        sharp(capBuffer)
          .resize(lebarCapPx, tinggiPx, { fit: 'contain', background: transparan })
          .png()
          .toBuffer(),
        sharp(tandaTanganBuffer)
          .resize(lebarTtdPx, tinggiPx, { fit: 'contain', background: transparan })
          .png()
          .toBuffer(),
      ]);

      // Cap digambar LEBIH DULU (lapisan bawah), tanda tangan SESUDAHNYA
      // (lapisan atas) — meniru dokumen fisik yang ditandatangani basah DI
      // ATAS stempel, sehingga coretan pena terlihat melintasi cap, bukan
      // tersembunyi di baliknya (dibalik dari urutan semula).
      const gabungan = await sharp({
        create: { width: totalLebarPx, height: tinggiPx, channels: 4, background: transparan },
      })
        .composite([
          { input: capResize, left: 0, top: 0 },
          { input: ttdResize, left: lebarCapPx - tumpangPx, top: 0 },
        ])
        .png()
        .toBuffer();

      return {
        buffer: gabungan,
        width: (totalLebarPx / SKALA) * PT_KE_PX_DOCX,
        height: tinggiPt * PT_KE_PX_DOCX,
        type: 'png',
      };
    }

    // Cuma salah satu (cap ATAU TTD) — tetap dilewatkan lewat sharp supaya
    // hasilnya konsisten PNG (aman dari bug tipeGambarDocx kalau berkas
    // asli ternyata bukan format yang dikenali).
    const tunggal = tandaTanganBuffer || capBuffer;
    const lebarPt = tandaTanganBuffer ? lebarTtdPt : lebarCapPt;
    const hasil = await sharp(tunggal)
      .resize(Math.round(lebarPt * SKALA), tinggiPx, { fit: 'contain', background: transparan })
      .png()
      .toBuffer();
    return { buffer: hasil, width: lebarPt * PT_KE_PX_DOCX, height: tinggiPt * PT_KE_PX_DOCX, type: 'png' };
  } catch {
    // Berkas TTD/cap rusak/tidak terbaca sharp — jatuh balik ke placeholder
    // nama/NIP seperti biasa, jangan sampai gagal generate seluruh dokumen.
    return null;
  }
}

/** Data blok tanda tangan (Kata Pengantar & Bab VI Penutup) — satu sumber
 * dipakai bersama supaya formatnya identik di kedua tempat dan kedua format. */
function dataTandaTangan(pejabat, meta, dok) {
  const namaPejabat =
    pejabat?.nama && pejabat.nama !== '-'
      ? pejabat.nama
      : '[Belum diisi — lengkapi di menu Setting Pejabat Penandatangan]';
  const nipPejabat = pejabat?.nip && pejabat.nip !== '-' ? pejabat.nip : '.....................';
  const namaOpdSingkat = String(meta.pdNama || '')
    .replace(/\s*Provinsi Maluku Utara$/i, '')
    .trim();
  const jabatanSingkat = `Kepala ${namaOpdSingkat}`;
  const bulanTahun = formatBulanTahun(dok.tanggal_pengesahan || new Date());
  return { namaPejabat, nipPejabat, jabatanSingkat, bulanTahun };
}

/** Blok tanda tangan versi PDF — dipanggil di Kata Pengantar dan Bab VI Penutup.
 * Kalau pejabat sudah mengunggah gambar TTD/cap sendiri, keduanya digambar
 * berdampingan (cap di kiri, TTD di kanan, cap sedikit tumpang tindih di
 * bawah TTD meniru tata letak dokumen fisik) di atas nama tercetak; kalau
 * tidak ada, jatuh balik ke spasi kosong seperti sebelumnya (placeholder
 * untuk tanda tangan basah manual). */
function renderTandaTanganPdf(pdf, pejabat, meta, dok, gambarBersih) {
  const { namaPejabat, nipPejabat, jabatanSingkat, bulanTahun } = dataTandaTangan(pejabat, meta, dok);
  const { tandaTanganBuffer, capBuffer } = gambarBersih || {};

  // BUG (dilaporkan user 2026-08-01): gambar TTD/cap kadang hilang persis di
  // pergantian halaman — pdf.image() TIDAK auto-pindah halaman seperti
  // pdf.text(), jadi kalau pdf.y sudah dekat batas bawah saat blok ini mulai
  // digambar, gambarnya tergambar di luar/tepat di tepi halaman (tak
  // terlihat), sementara nama/NIP di bawahnya (pakai pdf.text(), yang
  // auto-paginate) malah pindah ke halaman berikutnya sendirian tanpa
  // gambar. Estimasi 140pt = 2 baris label + gambar 65pt + jarak + 2 baris
  // nama/NIP, dilebihkan sedikit — kalau tidak cukup, pindah halaman dulu
  // supaya seluruh blok (label+gambar+nama+NIP) tetap utuh 1 halaman.
  const tinggiBlokDiperlukan = 140;
  const batasBawah = pdf.page.height - pdf.page.margins.bottom;
  if (pdf.y + tinggiBlokDiperlukan > batasBawah) {
    nextPortraitBerpita(pdf);
  }

  pdf.font('Helvetica').fontSize(10).fillColor('#000000');
  pdf.text(`Sofifi, ${bulanTahun}`, { align: 'right' });
  pdf.text(`${jabatanSingkat},`, { align: 'right' });

  if (tandaTanganBuffer || capBuffer) {
    const { tinggiPt: tinggiGambar, lebarTtdPt: lebarTtd, lebarCapPt: lebarCap, rasioTumpang } = TTD_LAYOUT;
    const y0 = pdf.y + 4;
    const kananX = leftMargin(pdf) + usableWidth(pdf);
    if (capBuffer) {
      try {
        pdf.image(capBuffer, kananX - lebarTtd - lebarCap * rasioTumpang, y0, {
          width: lebarCap,
          height: tinggiGambar,
        });
      } catch {
        /* berkas cap rusak/tidak terbaca — abaikan, TTD & nama tetap tampil */
      }
    }
    if (tandaTanganBuffer) {
      try {
        pdf.image(tandaTanganBuffer, kananX - lebarTtd, y0, { width: lebarTtd, height: tinggiGambar });
      } catch {
        /* berkas TTD rusak/tidak terbaca — abaikan, nama tetap tampil */
      }
    }
    pdf.y = y0 + tinggiGambar + 4;
  } else {
    pdf.moveDown(3);
  }

  pdf.font('Helvetica-Bold').text(namaPejabat, { align: 'right' });
  pdf.font('Helvetica').text(`NIP. ${nipPejabat}`, { align: 'right' });
}

/** Blok tanda tangan versi DOCX — dipanggil di Kata Pengantar dan Bab VI
 * Penutup. `gambarTtdCap` adalah hasil siapkanGambarTandaTanganDocx() yang
 * SUDAH digabung jadi satu gambar (cap menumpuk TTD) — dihitung sekali di
 * awal buildRenjaPermendagri14Docx dan dioper ke sini, bukan dihitung ulang
 * di setiap pemanggilan (fungsi ini dipanggil 2x, dan salah satunya di
 * dalam forEach yang tidak mendukung await untuk proses sharp async). */
function tandaTanganParagraphsDocx(pejabat, meta, dok, gambarTtdCap) {
  const { namaPejabat, nipPejabat, jabatanSingkat, bulanTahun } = dataTandaTangan(pejabat, meta, dok);

  // keepNext+keepLines di SETIAP paragraf blok ini (kecuali paragraf
  // terakhir, yang cukup keepLines) — permintaan/laporan user (2026-08-02):
  // blok tanda tangan (label+gambar+nama+NIP) kadang terpotong Word di
  // pergantian halaman, salah satu bagian jadi seperti "hilang" padahal
  // datanya ada. keepNext memberi tahu Word "jangan pisahkan paragraf ini
  // dari paragraf SESUDAHNYA lewat pergantian halaman" — dirantai di semua
  // paragraf blok supaya Word memperlakukan seluruhnya sebagai satu
  // kesatuan yang tidak boleh terpecah, mendorong seluruh blok pindah
  // bersama ke halaman baru kalau tidak muat, bukan terpotong di tengah.
  const paragrafGambar = [];
  if (gambarTtdCap) {
    paragrafGambar.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 100 },
        keepNext: true,
        keepLines: true,
        children: [
          new ImageRun({
            data: gambarTtdCap.buffer,
            type: gambarTtdCap.type,
            transformation: { width: gambarTtdCap.width, height: gambarTtdCap.height },
          }),
        ],
      }),
    );
  }

  return [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 400 },
      keepNext: true,
      keepLines: true,
      children: [new TextRun({ text: `Sofifi, ${bulanTahun}`, size: 20, font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: paragrafGambar.length ? 100 : 1200 },
      keepNext: true,
      keepLines: true,
      children: [new TextRun({ text: `${jabatanSingkat},`, size: 20, font: 'Arial' })],
    }),
    ...paragrafGambar,
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      keepNext: true,
      keepLines: true,
      children: [new TextRun({ text: namaPejabat, bold: true, size: 20, font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      keepLines: true,
      children: [new TextRun({ text: `NIP. ${nipPejabat}`, size: 20, font: 'Arial' })],
    }),
  ];
}

/** Paragraf isi Kata Pengantar, dipakai bersama oleh render PDF & DOCX. */
function paragrafKataPengantar(meta, dok) {
  return [
    `Puji dan syukur kami panjatkan kehadirat Tuhan Yang Maha Esa, karena atas rahmat dan karunia-Nya, ${meta.pdNama} dapat menyelesaikan penyusunan Rencana Kerja (Renja) Tahun ${dok.tahun}.`,
    `Renja ini disusun sebagai dokumen perencanaan tahunan Perangkat Daerah yang memuat program, kegiatan, indikator kinerja, target, dan pagu indikatif, berpedoman pada Peraturan Menteri Dalam Negeri Nomor 14 Tahun 2026 tentang Pedoman Penyusunan Rencana Kerja Pemerintah Daerah, serta mengacu pada Rencana Kerja Pembangunan Daerah (RKPD) dan Rencana Strategis (Renstra) ${meta.pdNama} Tahun ${meta.periodeStr}.`,
    `Ketahanan pangan merupakan salah satu urusan strategis yang menjadi perhatian utama Pemerintah Provinsi Maluku Utara, mengingat keterkaitannya yang erat dengan stabilitas harga, daya beli masyarakat, dan kesejahteraan sosial. Berbagai upaya pengendalian inflasi daerah, termasuk pelaksanaan Gerakan Pangan Murah (GPM) di berbagai kabupaten/kota, terus diperkuat sebagai wujud kehadiran pemerintah daerah dalam menjaga ketersediaan dan keterjangkauan pangan bagi masyarakat.`,
    `Rencana Kerja Tahun ${dok.tahun} ini disusun dengan memperhatikan hasil evaluasi pelaksanaan tahun-tahun sebelumnya, dinamika kesepakatan Rapat Koordinasi Teknis Perencanaan Pembangunan (Rakortekbang) Tahun 2026, serta aspirasi pemangku kepentingan, sehingga program dan kegiatan yang direncanakan benar-benar responsif terhadap kebutuhan penguatan ketahanan pangan daerah sekaligus selaras dengan prioritas pembangunan nasional.`,
    `Penyusunan dokumen ini merupakan hasil kerja sama dan koordinasi seluruh bidang dan unit kerja di lingkungan ${meta.pdNama}, dengan dukungan data dari Badan Perencanaan Pembangunan Daerah, Dewan Perwakilan Rakyat Daerah, serta instansi vertikal terkait. Kami menyampaikan penghargaan dan ucapan terima kasih atas kontribusi seluruh pihak dalam proses penyusunannya.`,
    'Kami menyadari bahwa dokumen ini masih memerlukan penyempurnaan. Oleh karena itu, kritik dan saran yang membangun sangat kami harapkan demi perbaikan pada penyusunan dokumen perencanaan berikutnya.',
    `Demikian Rencana Kerja ini disusun, semoga dapat menjadi acuan dalam pelaksanaan program dan kegiatan pembangunan Tahun ${dok.tahun}, serta memberikan kontribusi nyata bagi terwujudnya ketahanan pangan Provinsi Maluku Utara yang mandiri dan berkelanjutan.`,
  ];
}

// ---------------------------------------------------------------------------
// Konteks
// ---------------------------------------------------------------------------

/**
 * Bangun ulang narasi 6 bab tepat sebelum dokumen dicetak, setelah realisasi
 * dari DPA/LK disegarkan. Dengan begitu berkas yang diunduh selalu memuat
 * angka terbaru tanpa pengguna harus menekan Recall lebih dulu.
 */
async function muatKonteks(db, dokumenId) {
  const { RenjaDokumen, PerangkatDaerah, PeriodeRpjmd } = db;

  const dok = await RenjaDokumen.findByPk(dokumenId, {
    include: [
      { model: PerangkatDaerah, as: 'perangkatDaerah', required: false },
      { model: PeriodeRpjmd, as: 'periode', required: false },
    ],
  });
  if (!dok) throw new Error('renja_dokumen tidak ditemukan');

  try {
    const tahunRealisasi = Number(dok.tahun) - 2;
    await recalcDpaRealisasi(db, tahunRealisasi);
    await recalcLkDispang(db, tahunRealisasi);
  } catch (e) {
    console.warn('[Permendagri14] Recalc realisasi gagal:', e?.message || e);
  }

  const bab = await generateBabPermendagri14(db, dokumenId);
  const pdNama = dok.perangkatDaerah?.nama || `PD #${dok.perangkat_daerah_id}`;

  return {
    dok,
    bab,
    tabel41: bab.tabel41,
    meta: {
      pdNama,
      tahun: dok.tahun,
      periodeStr: dok.periode ? `${dok.periode.tahun_awal}–${dok.periode.tahun_akhir}` : '—',
      judulResmi: `RENCANA KERJA (RENJA)\n${pdNama.toUpperCase()}\nTAHUN ${dok.tahun}`,
    },
  };
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

const TEPI_TIPIS = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
};

function selDocx(teks, opsi = {}) {
  const { tebal = false, lebar = null, colSpan = 1, rowSpan = 1, align, headerHijau = false } = opsi;
  return new TableCell({
    borders: TEPI_TIPIS,
    columnSpan: colSpan,
    rowSpan,
    ...(lebar ? { width: { size: lebar, type: WidthType.PERCENTAGE } } : {}),
    ...(headerHijau ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: HEADER_TABEL_DOCX } } : {}),
    children: [
      new Paragraph({
        alignment: align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text: String(teks ?? ''),
            bold: tebal,
            size: 12,
            font: 'Arial',
            color: headerHijau ? 'FFFFFF' : undefined,
          }),
        ],
      }),
    ],
  });
}

/** Tabel 4.1 versi DOCX, kepala 3 tingkat memakai columnSpan/rowSpan bawaan docx. */
function tabel41Docx(tabel41) {
  const persen = lebarKolomPersen();
  const kepala = kepalaTabel(tabel41?.meta);

  const barisKepala = kepala.map(
    (baris) =>
      new TableRow({
        tableHeader: true,
        children: baris
          .filter((sel) => sel !== null)
          .map((sel) =>
            selDocx(sel.text, {
              tebal: true,
              align: 'center',
              colSpan: sel.colSpan || 1,
              rowSpan: sel.rowSpan || 1,
              headerHijau: true,
            }),
          ),
      }),
  );

  const barisNomor = new TableRow({
    children: barisPenomoran().map((t, i) => selDocx(t, { align: 'center', lebar: persen[i] })),
  });

  const barisIsi = (tabel41?.baris || []).map((b) => {
    const sel = selBaris(b);
    const tebal = BARIS_TEBAL.has(b.jenis);
    return new TableRow({
      children: sel.map((t, i) => selDocx(t, { tebal, lebar: persen[i] })),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [...barisKepala, barisNomor, ...barisIsi],
  });
}

/** Pisah "BAB I — PENDAHULUAN" jadi ["BAB I", "PENDAHULUAN"] — permintaan
 * user (2026-08-01) berdasarkan contoh dokumen Renja OPD lain: nomor bab dan
 * nama bab dicetak 2 baris terpisah (gaya "Title" dokumen resmi), bukan 1
 * baris dengan tanda pisah. String utuh (dengan " — ") tetap dipakai apa
 * adanya untuk entri Daftar Isi PDF, karena satu baris memang lazim di
 * daftar isi/daftar tabel. */
function pisahJudulBab(teksJudul) {
  const idx = teksJudul.indexOf(' — ');
  if (idx === -1) return [teksJudul, ''];
  return [teksJudul.slice(0, idx), teksJudul.slice(idx + 3)];
}

/** Judul Bab DOCX — dicetak 2 paragraf terpisah (nomor bab, lalu nama bab)
 * meniru gaya "Title" dokumen Renja resmi, dengan jarak lega setelahnya
 * sebelum subbab/isi pertama supaya tidak terasa mepet. Mengembalikan array
 * (bukan 1 Paragraph) — pemanggilnya WAJIB di-spread (...judul(...)). */
function judul(teks, ukuran = 24, opsi = {}) {
  const [roman, namaBab] = pisahJudulBab(teks);
  const hasil = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: !!opsi.halamanBaru,
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: namaBab ? 20 : 400 },
      children: [
        new TextRun({ text: roman, bold: true, size: ukuran, font: 'Georgia', color: WARNA_COVER.NAVY.replace('#', '') }),
      ],
    }),
  ];
  if (namaBab) {
    hasil.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({ text: namaBab, bold: true, size: ukuran, font: 'Georgia', color: WARNA_COVER.NAVY.replace('#', '') }),
        ],
      }),
    );
  }
  return hasil;
}

/** Ubah teks bab (markdown sederhana) menjadi paragraf & tabel DOCX. */
function isiBabDocx(teksBab) {
  const anak = [];
  const baris = String(teksBab || '').split(/\r?\n/);
  let bufferTabel = [];

  const bilasTabel = () => {
    if (bufferTabel.length < 2) {
      bufferTabel.forEach((l) =>
        anak.push(new Paragraph({ children: [new TextRun({ text: l, size: 20, font: 'Arial' })] })),
      );
      bufferTabel = [];
      return;
    }
    const pecah = (l) =>
      l
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim().replace(/\*\*/g, ''));
    const isiBaris = bufferTabel.filter((l) => !/^\|[-:\s|]+\|$/.test(l.trim()));
    const kepala = pecah(isiBaris[0]);
    const rows = [
      new TableRow({
        tableHeader: true,
        children: kepala.map((t) => selDocx(t, { tebal: true, align: 'center', headerHijau: true })),
      }),
      ...isiBaris.slice(1).map(
        (l) =>
          new TableRow({
            children: pecah(l)
              .slice(0, kepala.length)
              .map((t) => selDocx(t)),
          }),
      ),
    ];
    anak.push(
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
      new Paragraph({ text: '' }),
    );
    bufferTabel = [];
  };

  for (const l of baris) {
    if (l.trim().startsWith('|')) {
      bufferTabel.push(l);
      continue;
    }
    if (bufferTabel.length) bilasTabel();
    if (!l.trim()) {
      anak.push(new Paragraph({ text: '' }));
      continue;
    }
    // Judul subbab "2.1 ..." — heading level 2 supaya ikut Daftar Isi Word.
    const subbab = SUBBAB_REGEX.test(l.trim());
    // Judul tabel "Tabel 2.1 ..." — pakai field SEQ Word supaya bisa ditarik
    // Daftar Tabel (TOC captionLabel:'Tabel') sekaligus bernomor otomatis.
    const cocokTabel = l.trim().match(TABEL_CAPTION_REGEX);
    if (cocokTabel) {
      const sisaJudul = l.trim().replace(/^Tabel\s+\d+\.\d+\s*/, '');
      anak.push(
        new Paragraph({
          style: 'Caption',
          spacing: { before: 200, after: 80, line: DOCX_LINE_SPACING },
          children: [
            new TextRun({ text: 'Tabel ', bold: true, size: 20, font: 'Arial' }),
            new SequentialIdentifier('Tabel'),
            new TextRun({ text: ` ${sisaJudul}`, bold: true, size: 20, font: 'Arial' }),
          ],
        }),
      );
      continue;
    }
    // Daftar bernomor "1. Teks..." — indent menjorok supaya baris lanjutan
    // sejajar teks (bukan balik ke margin), meniru gaya dokumen resmi.
    const cocokBernomor = l.trim().match(/^(\d+\.)\s+(\S.*)$/);
    if (cocokBernomor) {
      anak.push(
        new Paragraph({
          spacing: { line: DOCX_LINE_SPACING, after: 60 },
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 380, hanging: 380 },
          children: [new TextRun({ text: l.trim(), size: 20, font: 'Arial' })],
        }),
      );
      continue;
    }
    // Subbab (Heading 2) dibedakan dari body text lewat warna emerald tema +
    // font serif (identitas "buku", konsisten dengan judul Bab) + ukuran
    // sedikit lebih besar — nomor dan judul subbab SATU TextRun bersama
    // (sengaja sama besar, bukan nomor kecil terpisah dari judul besar).
    anak.push(
      new Paragraph({
        heading: subbab ? HeadingLevel.HEADING_2 : undefined,
        spacing: subbab ? { before: 280, after: 120 } : { line: DOCX_LINE_SPACING },
        alignment: subbab ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: l,
            bold: subbab,
            size: subbab ? 24 : 20,
            font: subbab ? 'Georgia' : 'Arial',
            color: subbab ? WARNA_COVER.EMERALD.replace('#', '') : undefined,
          }),
        ],
      }),
    );
  }
  if (bufferTabel.length) bilasTabel();
  return anak;
}

/** Paragraf rata tengah putih di atas latar hijau — dipakai berulang pada cover DOCX. */
function baris(teks, opsi = {}) {
  const { tebal = false, ukuran = 24, warna = WARNA_COVER.PUTIH.replace('#', ''), italic = false, spasi = {}, font = 'Arial' } = opsi;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: spasi,
    children: [new TextRun({ text: teks, bold: tebal, italics: italic, size: ukuran, color: warna, font })],
  });
}

/** Sampul dari berkas gambar siap pakai — 1 paragraf gambar pas ke halaman A4
 * (794x1123 px ~ 96dpi) tanpa menggepengkan, diletakkan di section tersendiri
 * bermargin 0. Rasio dihitung dari berkas asli, bukan diasumsikan persis A4. */
function halamanCoverGambarDocx() {
  const HAL_W = 794;
  const HAL_H = 1123;
  let w = HAL_W;
  let h = HAL_H;
  if (COVER_IMAGE_DIM?.width && COVER_IMAGE_DIM?.height) {
    const rasio = COVER_IMAGE_DIM.width / COVER_IMAGE_DIM.height;
    h = Math.round(HAL_W / rasio);
    if (h > HAL_H) {
      h = HAL_H;
      w = Math.round(HAL_H * rasio);
    }
  }
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        new ImageRun({ data: COVER_IMAGE_BUFFER, type: 'png', transformation: { width: w, height: h } }),
      ],
    }),
  ];
}

/** Halaman sampul (Cover) hijau tema Ketahanan Pangan — sel tabel penuh 1 halaman, tanpa nomor halaman. */
function halamanCoverVektorDocx(meta, dok) {
  const pd = String(meta.pdNama || '')
    .replace(/\s*Provinsi Maluku Utara$/i, '')
    .toUpperCase();

  const isi = [
    baris('', { spasi: { before: 200 } }),
    ...(LOGO_BUFFER
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({ data: LOGO_BUFFER, type: 'jpg', transformation: { width: 80, height: 80 } }),
            ],
          }),
        ]
      : []),
    baris('P E M E R I N T A H   P R O V I N S I   M A L U K U   U T A R A', {
      tebal: true,
      ukuran: 20,
      spasi: { before: 300, after: 600 },
    }),
    baris('Rencana Kerja (Renja)', { tebal: true, ukuran: 52, font: 'Georgia', spasi: { after: 120 } }),
    baris(pd, { tebal: true, ukuran: 34, font: 'Georgia', warna: WARNA_COVER.EMAS.replace('#', ''), spasi: { after: 500 } }),
    baris(`TAHUN ${dok.tahun}`, { tebal: true, ukuran: 26, spasi: { after: 500 } }),
    baris('Mewujudkan Ketahanan Pangan Maluku Utara yang Mandiri dan Berkelanjutan', {
      italic: true,
      ukuran: 20,
      warna: WARNA_COVER.EMAS.replace('#', ''),
    }),
  ];

  const selCover = new TableCell({
    width: { size: 100, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: WARNA_COVER.NAVY.replace('#', '') },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    children: isi,
  });

  const tabelCover = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        height: { value: 15000, rule: HeightRule.ATLEAST },
        children: [selCover],
      }),
    ],
  });

  return [tabelCover];
}

/** Dipakai gambar jadi kalau tersedia; kalau tidak, jatuh balik ke sampul vektor. */
/** Sampul vektor navy/emerald/gold dipakai LANGSUNG (2026-08-02, sama
 * seperti versi PDF — lihat komentar renderCoverPdf) — menggantikan
 * preferensi ke halamanCoverGambarDocx (berkas gambar lama dari tim). */
function halamanCoverDocx(meta, dok) {
  return halamanCoverVektorDocx(meta, dok);
}

/** Halaman Kata Pengantar, memuat blok tanda tangan Kepala Dinas. */
async function halamanKataPengantarDocx(db, meta, dok, pejabat, gambarTtdCap) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: 'Kata Pengantar', bold: true, size: 28, font: 'Georgia', color: WARNA_COVER.NAVY.replace('#', '') })],
    }),
    ...paragrafKataPengantar(meta, dok).map(
      (p) =>
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: DOCX_LINE_SPACING },
          children: [new TextRun({ text: p, size: 20, font: 'Arial' })],
        }),
    ),
    ...tandaTanganParagraphsDocx(pejabat, meta, dok, gambarTtdCap),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

/** Halaman Daftar Isi — memakai field TOC bawaan Word (perbarui via klik-kanan > Update Field). */
function halamanDaftarIsiDocx() {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: 'Daftar Isi', bold: true, size: 28, font: 'Georgia', color: WARNA_COVER.NAVY.replace('#', '') })],
    }),
    new TableOfContents('Daftar Isi', { hyperlink: true, headingStyleRange: '1-2' }),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: 'Daftar Tabel', bold: true, size: 28, font: 'Georgia', color: WARNA_COVER.NAVY.replace('#', '') })],
    }),
    // captionLabelIncludingNumbers (bukan captionLabel) — permintaan user
    // (2026-08-02): captionLabel menghasilkan field Word "TOC \a" yang
    // SENGAJA HANYA menampilkan teks caption tanpa label+nomor ("Capaian
    // Indikator..." saja). captionLabelIncludingNumbers menghasilkan
    // "TOC \c" yang menyertakan label+nomor ("Tabel 2.1 Capaian
    // Indikator...") sesuai format yang diminta, sama seperti Daftar Tabel
    // versi PDF yang sudah benar dari awal.
    new TableOfContents('Daftar Tabel', { hyperlink: true, captionLabelIncludingNumbers: 'Tabel' }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

async function buildRenjaPermendagri14Docx(db, dokumenId, options = {}) {
  const { dok, bab, tabel41, meta } = await muatKonteks(db, dokumenId);
  const versi = options.documentVersion != null ? options.documentVersion : dok.versi;
  const pejabat = await ambilPejabatKepalaDinas(db, dok.tahun);
  const gambarTtdCap = await siapkanGambarTandaTanganDocx(pejabat);

  const halamanCover = halamanCoverDocx(meta, dok, versi);
  const halamanKataPengantar = await halamanKataPengantarDocx(db, meta, dok, pejabat, gambarTtdCap);
  const halamanDaftarIsi = halamanDaftarIsiDocx();

  // Bab I-III dan V-VI potret; Bab IV dipecah agar tabelnya masuk bagian landscape.
  // Bab I tidak perlu page-break sendiri (sudah dapat halaman baru dari Daftar
  // Isi), tapi Bab II & III WAJIB — tanpa ini keduanya bisa nyambung ke Bab
  // sebelumnya di halaman yang sama kalau isi Bab sebelumnya pas-pasan.
  const bagianPotretAwal = [];
  JUDUL_BAB.slice(0, 3).forEach(([kunci, teksJudul], idx) => {
    bagianPotretAwal.push(...judul(teksJudul, 24, { halamanBaru: idx > 0 }), ...isiBabDocx(bab[kunci]));
  });

  // sesudahTabel (narasi + Tabel 4.2, tabel ringkas 6 kolom) sengaja DIPISAH
  // ke section potret tersendiri, bukan ikut landscape bareng Tabel 4.1 (17/18
  // kolom) — supaya konsisten dengan versi PDF yang sudah balik ke potret
  // lewat nextPortraitBerpita() sebelum merender sesudahTabel.
  const [sebelumTabel, sesudahTabel] = String(bab.bab4 || '').split(PENANDA_TABEL);
  const bagianLandscape = [
    ...judul('BAB IV — RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH'),
    ...isiBabDocx(sebelumTabel),
    tabel41Docx(tabel41),
    new Paragraph({ text: '' }),
  ];
  const bagianPotretSesudahTabel = isiBabDocx(sesudahTabel || '');

  // Bab V tidak perlu page-break sendiri (section landscape->potret sebelumnya
  // sudah otomatis pindah halaman), tapi Bab VI WAJIB.
  const bagianPotretAkhir = [];
  JUDUL_BAB.slice(4).forEach(([kunci, teksJudul], idx) => {
    bagianPotretAkhir.push(...judul(teksJudul, 24, { halamanBaru: idx > 0 }), ...isiBabDocx(bab[kunci]));
    if (kunci === 'bab6') {
      bagianPotretAkhir.push(...tandaTanganParagraphsDocx(pejabat, meta, dok, gambarTtdCap));
    }
  });

  const footerNomor = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial' })],
      }),
    ],
  });

  const doc = new Document({
    creator: 'ePelara',
    title: `Renja ${meta.pdNama} Tahun ${dok.tahun}`,
    description: 'Dokumen resmi Renja Perangkat Daerah — Permendagri 14/2026',
    sections: [
      {
        // Sampul: section tersendiri bermargin 0 (gambar tampil penuh tepi
        // halaman) dan tanpa footer — tidak ikut dihitung nomor halaman.
        properties: { page: { margin: { top: 0, right: 0, bottom: 0, left: 0 } } },
        children: halamanCover,
      },
      {
        // Kata Pengantar mulai dari halaman 1 (penomoran di-reset, sampul tak dihitung).
        properties: { page: { pageNumbers: { start: 1 } } },
        footers: { default: footerNomor },
        children: [...halamanKataPengantar, ...halamanDaftarIsi, ...bagianPotretAwal],
      },
      {
        properties: { page: { size: { orientation: 'landscape' } } },
        footers: { default: footerNomor },
        children: bagianLandscape,
      },
      { properties: {}, footers: { default: footerNomor }, children: bagianPotretSesudahTabel },
      { properties: {}, footers: { default: footerNomor }, children: bagianPotretAkhir },
    ],
  });

  return Packer.toBuffer(doc);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/** Motif dekoratif "bulir padi" sederhana — beberapa elips di sepanjang batang lengkung. */
function gambarBulirPadi(pdf, x, y, tinggi, warna, cermin = false) {
  const arah = cermin ? -1 : 1;
  pdf.save();
  pdf.lineWidth(1.4).strokeColor(warna);
  pdf.moveTo(x, y).bezierCurveTo(x + arah * 18, y - tinggi * 0.4, x - arah * 6, y - tinggi * 0.75, x + arah * 4, y - tinggi).stroke();
  const jumlahBulir = 6;
  for (let i = 1; i <= jumlahBulir; i += 1) {
    const t = i / (jumlahBulir + 1);
    const bx = x + arah * (18 * t * 0.9);
    const by = y - tinggi * t;
    pdf.save();
    pdf.fillColor(warna);
    pdf.ellipse(bx + arah * 7, by - 2, 5, 3).fill();
    pdf.restore();
  }
  pdf.restore();
}

/** Sampul jadi dari berkas gambar siap pakai — pas ke 1 halaman A4 tanpa
 * menggepengkan gambar (rasio berkas belum tentu persis rasio A4). */
function renderCoverGambarPdf(pdf) {
  pdf.image(COVER_IMAGE_BUFFER, 0, 0, {
    fit: [pdf.page.width, pdf.page.height],
    align: 'center',
    valign: 'center',
  });
}

/** Halaman sampul (Cover) — sampul vektor navy/emerald/gold "Government
 * Editorial" dipakai LANGSUNG (2026-08-02, atas persetujuan user terhadap
 * mockup arah desain), menggantikan preferensi ke berkas gambar sampul lama
 * dari tim ("cover-renja-dinas-pangan-2027.png"). Berkas lama TIDAK dihapus
 * (masih ada di assets/branding/), jadi bisa dikembalikan kalau perlu —
 * cukup balik urutan pemanggilan di bawah. */
function renderCoverPdf(pdf, meta, dok) {
  renderCoverVektorPdf(pdf, meta, dok);
}

function renderCoverVektorPdf(pdf, meta, dok) {
  const pd = String(meta.pdNama || '')
    .replace(/\s*Provinsi Maluku Utara$/i, '')
    .toUpperCase();
  const lebar = pdf.page.width;
  const tinggi = pdf.page.height;

  // --- Latar gradien navy, dari tua (atas) ke sedikit lebih terang (bawah) ---
  const gradien = pdf.linearGradient(0, 0, 0, tinggi);
  gradien.stop(0, WARNA_COVER.NAVY).stop(1, WARNA_COVER.NAVY_SOFT);
  pdf.rect(0, 0, lebar, tinggi).fill(gradien);

  // --- Garis aksen emas tipis atas & bawah (dulu pita tebal 8pt, sekarang
  // hairline 2pt — gaya editorial lebih restrained, bukan pita mencolok) ---
  pdf.rect(0, 0, lebar, 2).fill(WARNA_COVER.EMAS);
  pdf.rect(0, tinggi - 2, lebar, 2).fill(WARNA_COVER.EMAS);

  // --- Gelombang dekoratif emerald tipis di sepertiga bawah ---
  pdf.save();
  pdf.fillColor(WARNA_COVER.EMERALD).opacity(0.4);
  pdf
    .moveTo(0, tinggi * 0.66)
    .bezierCurveTo(lebar * 0.28, tinggi * 0.6, lebar * 0.68, tinggi * 0.74, lebar, tinggi * 0.64)
    .lineTo(lebar, tinggi)
    .lineTo(0, tinggi)
    .closePath()
    .fill();
  pdf.restore();
  pdf.opacity(1);

  // --- Lencana krem berisi lambang Provinsi Maluku Utara ---
  const pusatX = lebar / 2;
  const pusatYLogo = 118;
  const radius = 46;
  pdf.save();
  pdf.fillColor(WARNA_COVER.PUTIH);
  pdf.circle(pusatX, pusatYLogo, radius).fill();
  pdf.restore();
  if (LOGO_BUFFER) {
    const sisi = radius * 1.5;
    pdf.image(LOGO_BUFFER, pusatX - sisi / 2, pusatYLogo - sisi / 2, {
      fit: [sisi, sisi],
      align: 'center',
      valign: 'center',
    });
  }

  // --- Motif bulir padi kiri & kanan bawah ---
  gambarBulirPadi(pdf, 70, tinggi - 50, 90, WARNA_COVER.EMAS, false);
  gambarBulirPadi(pdf, lebar - 70, tinggi - 50, 90, WARNA_COVER.EMAS, true);

  // --- Kop instansi (eyebrow kecil, huruf besar berjarak) ---
  let y = pusatYLogo + radius + 26;
  pdf.fillColor(WARNA_COVER.PUTIH).font('Helvetica-Bold').fontSize(10.5);
  pdf.text('P E M E R I N T A H   P R O V I N S I   M A L U K U   U T A R A', 0, y, {
    align: 'center',
    width: lebar,
  });

  // --- Blok judul utama, serif untuk kesan "buku" ---
  y += 56;
  pdf.fillColor(WARNA_COVER.PUTIH).font('Times-Bold').fontSize(28);
  pdf.text('Rencana Kerja (Renja)', 0, y, { align: 'center', width: lebar });
  y += 40;
  pdf.fillColor(WARNA_COVER.EMAS).font('Times-Bold').fontSize(19);
  pdf.text(pd, 0, y, { align: 'center', width: lebar });

  // --- Garis pemisah tipis ---
  y += 34;
  pdf.rect(lebar / 2 - 22, y, 44, 1.4).fill(WARNA_COVER.EMAS);

  y += 20;
  pdf.fillColor(WARNA_COVER.PUTIH).font('Helvetica-Bold').fontSize(15);
  pdf.text(`TAHUN ${dok.tahun}`, 0, y, { align: 'center', width: lebar });

  // --- Frasa tematik pangan ---
  y += 42;
  pdf.fillColor(WARNA_COVER.EMAS).font('Helvetica-Oblique').fontSize(11);
  pdf.text('Mewujudkan Ketahanan Pangan Maluku Utara yang Mandiri dan Berkelanjutan', 40, y, {
    align: 'center',
    width: lebar - 80,
  });

  pdf.fillColor('#000000');
}

/** Halaman Kata Pengantar, memuat blok tanda tangan Kepala Dinas. */
function renderKataPengantarPdf(pdf, pejabat, meta, dok, gambarBersih) {
  pdf.font('Times-Bold').fontSize(16).fillColor(WARNA_COVER.NAVY);
  pdf.text('Kata Pengantar', { align: 'center' });
  pdf.fillColor('#000000');
  pdf.moveDown(0.8);

  pdf.font('Helvetica').fontSize(10);
  for (const p of paragrafKataPengantar(meta, dok)) {
    pdf.text(p, { align: 'justify', lineGap: PDF_LINE_GAP });
    pdf.moveDown(0.5);
  }

  pdf.moveDown(0.6);
  renderTandaTanganPdf(pdf, pejabat, meta, dok, gambarBersih);
}

/** Nomor halaman cetak: sampul (indeks 0) tidak dihitung sama sekali — Kata
 * Pengantar menjadi halaman 1, sesuai konvensi dokumen resmi. */
function labelHalaman(pdf) {
  return pdf.bufferedPageRange().count - 1;
}

/** Cetak nomor halaman di semua halaman terbuffer, kecuali sampul (halaman 0). */
function stempelNomorHalaman(pdf) {
  const range = pdf.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    if (i === 0) continue; // sampul tidak diberi nomor
    pdf.switchToPage(i);
    // Jarak tetap dari tepi bawah fisik (bukan dari margins.bottom) — supaya
    // konsisten di halaman potret maupun landscape (Tabel 4.1), yang
    // margin-nya sama-sama 40pt standar (halaman polos, tanpa hiasan).
    const y = pdf.page.height - 28;
    pdf
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(WARNA_COVER.NAVY)
      .text(String(i), 0, y, {
        align: 'center',
        width: pdf.page.width,
        height: 20,
        lineBreak: false,
      });
  }
}

/** Cetak judul Bab PDF 2 baris (nomor bab, lalu nama bab) — konsisten dengan
 * versi DOCX (lihat fungsi judul()), permintaan user (2026-08-01) meniru
 * gaya dokumen Renja resmi. */
function cetakJudulBabPdf(pdf, teksJudul) {
  const [roman, namaBab] = pisahJudulBab(teksJudul);
  pdf.fontSize(13).fillColor(WARNA_COVER.NAVY).font('Times-Bold').text(roman, { align: 'center' });
  if (namaBab) {
    pdf.text(namaBab, { align: 'center' });
  }
  pdf.fillColor('#000000');
  pdf.moveDown(0.6);
}

/**
 * Render satu bab sambil melacak halaman tiap subbab ("2.1 ...") dan judul
 * tabel ("Tabel 2.1 ...") di dalamnya, dipecah pada baris yang cocok supaya
 * nomor halamannya presisi (bukan hanya halaman awal bab).
 */
function renderBabTerlacak(pdf, teksBab, { onSubbab, onTabel, landscapeUntukTabel } = {}) {
  const baris = String(teksBab || '').split(/\r?\n/);
  let segmen = [];
  let modeLandscape = false;
  const bilas = () => {
    if (!segmen.length) return;
    renderMarkdownToPdf(pdf, segmen.join('\n'), { lineGap: PDF_LINE_GAP, hangingIndentList: true, ...HEADER_TABEL_PDF });
    segmen = [];
  };
  for (const l of baris) {
    const t = l.trim();
    const cocokSubbab = SUBBAB_REGEX.test(t);
    const cocokTabel = TABEL_CAPTION_REGEX.test(t);
    if (cocokSubbab || cocokTabel) {
      bilas();
      const perluLandscape = cocokTabel && landscapeUntukTabel && landscapeUntukTabel(t);
      // Kembali ke potret dulu kalau segmen sebelumnya landscape tapi yang
      // baru bukan tabel lebar lagi — supaya narasi biasa tidak ikut melebar.
      if (modeLandscape && !perluLandscape) {
        nextPortraitBerpita(pdf);
        modeLandscape = false;
      }
      if (perluLandscape && !modeLandscape) {
        addLandscape(pdf);
        modeLandscape = true;
      }
      const halaman = labelHalaman(pdf);
      // BUG (ditemukan 2026-08-01): sebelumnya "else if (onSubbab)" tanpa
      // syarat cocokSubbab — kalau caller cuma kasih onSubbab TANPA onTabel
      // (baru terjadi pertama kali di jalur Bab IV, lihat sebelumTabel di
      // atas), baris "Tabel X.Y ..." salah kaprah ikut tercatat sebagai
      // subbab ke Daftar Isi. Sekarang eksplisit cek cocokSubbab supaya
      // baris tabel tanpa handler onTabel diam saja, tidak nyasar ke onSubbab.
      if (cocokTabel && onTabel) onTabel(t, halaman);
      else if (cocokSubbab && onSubbab) onSubbab(t, halaman);
    }
    segmen.push(l);
  }
  bilas();
  if (modeLandscape) nextPortraitBerpita(pdf);
}

/** Tulis satu daftar dua-kolom (judul kiri, nomor halaman kanan) pada halaman aktif.
 * Nomor halaman disejajarkan ke BARIS TERAKHIR judul, supaya tetap rapi walau
 * judulnya membungkus lebih dari satu baris. */
function tulisDaftarDuaKolom(pdf, entri, { indentSubbab = 14 } = {}) {
  const lebar = usableWidth(pdf);
  for (const e of entri) {
    pdf.font(e.tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(e.tebal ? 11 : 10.5);
    const indent = e.level ? indentSubbab : 0;
    const widthJudul = lebar - indent - 40;
    const y = pdf.y;
    const tinggiJudul = pdf.heightOfString(e.judul, { width: widthJudul });
    const tinggiBaris = pdf.currentLineHeight();
    pdf.text(e.judul, leftMargin(pdf) + indent, y, { width: widthJudul });
    pdf.text(String(e.halaman), leftMargin(pdf), y + Math.max(0, tinggiJudul - tinggiBaris), {
      width: lebar,
      align: 'right',
    });
    pdf.y = y + tinggiJudul;
    pdf.moveDown(0.55);
  }
}

/** Tulis Daftar Isi pada halaman yang sudah dicadangkan sebelumnya. */
function isiDaftarIsiPdf(pdf, halamanDaftarIsi, entri) {
  pdf.switchToPage(halamanDaftarIsi);
  pdf.x = leftMargin(pdf);
  pdf.y = topMargin(pdf);

  pdf.font('Times-Bold').fontSize(16).fillColor(WARNA_COVER.NAVY);
  pdf.text('Daftar Isi', { align: 'center' });
  pdf.fillColor('#000000');
  pdf.moveDown(1.5);

  tulisDaftarDuaKolom(pdf, entri);
}

/** Tulis Daftar Tabel pada halaman yang sudah dicadangkan sebelumnya. */
function isiDaftarTabelPdf(pdf, halamanDaftarTabel, entri) {
  pdf.switchToPage(halamanDaftarTabel);
  pdf.x = leftMargin(pdf);
  pdf.y = topMargin(pdf);

  pdf.font('Times-Bold').fontSize(16).fillColor(WARNA_COVER.NAVY);
  pdf.text('Daftar Tabel', { align: 'center' });
  pdf.fillColor('#000000');
  pdf.moveDown(1.5);

  if (!entri.length) {
    pdf.font('Helvetica').fontSize(10.5).text('Tidak ada tabel.', leftMargin(pdf));
    return;
  }
  tulisDaftarDuaKolom(pdf, entri);
}

async function buildRenjaPermendagri14Pdf(db, dokumenId) {
  const { dok, bab, tabel41, meta } = await muatKonteks(db, dokumenId);
  const pejabat = await ambilPejabatKepalaDinas(db, dok.tahun);
  const gambarBersih = await siapkanGambarBersihTtdCap(pejabat);

  return new Promise((resolve, reject) => {
    const potongan = [];
    const pdf = new PDFDocument({
      margin: PDF_THEME.PAGE_MARGIN,
      size: 'A4',
      layout: 'portrait',
      autoFirstPage: false,
      bufferPages: true,
    });
    pdf.on('data', (c) => potongan.push(c));
    pdf.on('end', () => resolve(Buffer.concat(potongan)));
    pdf.on('error', reject);

    try {
      const daftarIsiEntri = [];
      const daftarTabelEntri = [];

      // --- Sampul (tidak dihitung dalam penomoran) ---
      addPortrait(pdf);
      renderCoverPdf(pdf, meta, dok);

      // --- Kata Pengantar: halaman 1 ---
      nextPortraitBerpita(pdf);
      daftarIsiEntri.push({ judul: 'KATA PENGANTAR', halaman: labelHalaman(pdf), tebal: true });
      renderKataPengantarPdf(pdf, pejabat, meta, dok, gambarBersih);

      // --- Daftar Isi (dicadangkan): halaman 2 ---
      nextPortraitBerpita(pdf);
      daftarIsiEntri.push({ judul: 'DAFTAR ISI', halaman: labelHalaman(pdf), tebal: true });
      const halamanDaftarIsi = labelHalaman(pdf);

      // --- Daftar Tabel (dicadangkan): halaman 3 ---
      nextPortraitBerpita(pdf);
      daftarIsiEntri.push({ judul: 'DAFTAR TABEL', halaman: labelHalaman(pdf), tebal: true });
      const halamanDaftarTabel = labelHalaman(pdf);

      // --- Isi dokumen: Bab I-III dan V-VI potret; Bab IV dipecah untuk tabel landscape ---
      // Setiap Bab WAJIB mulai di halaman baru (nextPortrait di awal iterasi,
      // bukan cuma sekali sebelum loop) — sebelumnya cuma dipanggil sekali di
      // luar loop sehingga Bab I/II/III bisa "bercampur" satu halaman kalau
      // kebetulan isi Bab sebelumnya tidak pas berakhir di batas halaman.
      for (const [kunci, teksJudul] of JUDUL_BAB.slice(0, 3)) {
        nextPortraitBerpita(pdf);
        daftarIsiEntri.push({ judul: teksJudul, halaman: labelHalaman(pdf), tebal: true });
        cetakJudulBabPdf(pdf, teksJudul);
        renderBabTerlacak(pdf, bab[kunci], {
          onSubbab: (judul, halaman) => daftarIsiEntri.push({ judul, halaman, level: 1 }),
          onTabel: (judul, halaman) => daftarTabelEntri.push({ judul, halaman }),
          landscapeUntukTabel: kunci === 'bab2' ? (t) => TABEL_LEBAR_BAB2.test(t) : undefined,
        });
      }

      // --- Bab IV: narasi potret, tabel landscape ---
      const [sebelumTabel, sesudahTabel] = String(bab.bab4 || '').split(PENANDA_TABEL);
      nextPortraitBerpita(pdf);
      daftarIsiEntri.push({ judul: JUDUL_BAB[3][1], halaman: labelHalaman(pdf), tebal: true });
      cetakJudulBabPdf(pdf, 'BAB IV — RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH');
      // sebelumTabel cuma narasi (Tabel 4.1 yang sesungguhnya disisipkan
      // terpisah lewat drawPdfGridTable di bawah, bukan sebagai tabel
      // markdown di dalam teks ini) — dipakai renderBabTerlacak (bukan
      // renderMarkdownToPdf langsung) supaya subbab 4.1 ikut tercatat ke
      // Daftar Isi lewat callback onSubbab, presisi per baris seperti Bab
      // lain, bukan asumsi "baris pertama" yang ternyata tidak berlaku
      // untuk sesudahTabel (subbab 4.2 di tengah teks, bukan baris pertama).
      renderBabTerlacak(pdf, sebelumTabel, {
        onSubbab: (judul, halaman) => daftarIsiEntri.push({ judul, halaman, level: 1 }),
      });

      addLandscape(pdf);
      daftarTabelEntri.push({
        judul: `Tabel 4.1 Rencana Program dan Kegiatan Prioritas Daerah Tahun ${dok.tahun}`,
        halaman: labelHalaman(pdf),
      });
      const lebar = usableWidth(pdf);
      drawPdfGridTable(pdf, {
        left: leftMargin(pdf),
        yStart: pdf.y,
        cols: lebarKolom(lebar),
        headers: kepalaTabel(tabel41?.meta),
        rows: barisTabel(tabel41).slice(1), // baris penomoran sudah jadi bagian kepala
        fontSize: 6,
        ...HEADER_TABEL_PDF,
      });

      nextPortraitBerpita(pdf);
      if (sesudahTabel) {
        // sesudahTabel memuat subbab 4.2 (di tengah teks, BUKAN baris
        // pertama — beda dari sebelumTabel) diikuti narasi lalu Tabel 4.2
        // sebagai tabel markdown biasa (bukan drawPdfGridTable custom
        // seperti Tabel 4.1) — renderBabTerlacak menangani parsing tabel
        // markdown itu sendiri via renderMarkdownToPdf internal, sekaligus
        // mencatat subbab & tabel ke Daftar Isi/Daftar Tabel dengan halaman
        // yang presisi per baris.
        renderBabTerlacak(pdf, sesudahTabel, {
          onSubbab: (judul, halaman) => daftarIsiEntri.push({ judul, halaman, level: 1 }),
          onTabel: (judul, halaman) => daftarTabelEntri.push({ judul, halaman }),
        });
      }

      for (const [kunci, teksJudul] of JUDUL_BAB.slice(4)) {
        nextPortraitBerpita(pdf);
        daftarIsiEntri.push({ judul: teksJudul, halaman: labelHalaman(pdf), tebal: true });
        cetakJudulBabPdf(pdf, teksJudul);
        renderBabTerlacak(pdf, bab[kunci], {
          onSubbab: (judul, halaman) => daftarIsiEntri.push({ judul, halaman, level: 1 }),
          onTabel: (judul, halaman) => daftarTabelEntri.push({ judul, halaman }),
        });
        if (kunci === 'bab6') {
          pdf.moveDown(1.2);
          renderTandaTanganPdf(pdf, pejabat, meta, dok, gambarBersih);
        }
      }

      pdf
        .fontSize(8)
        .fillColor('#666666')
        .text('Dokumen resmi (PDF) — ePelara · Permendagri Nomor 14 Tahun 2026', {
          align: 'left',
        });

      // --- Kembali isi Daftar Isi/Daftar Tabel & stempel nomor halaman ---
      isiDaftarIsiPdf(pdf, halamanDaftarIsi, daftarIsiEntri);
      isiDaftarTabelPdf(pdf, halamanDaftarTabel, daftarTabelEntri);
      stempelNomorHalaman(pdf);

      pdf.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  buildRenjaPermendagri14Docx,
  buildRenjaPermendagri14Pdf,
  muatKonteks,
  PENANDA_TABEL,
};
