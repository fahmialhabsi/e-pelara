'use strict';

/**
 * Parser PDF "Cetak RKA Rincian Belanja" dari Aplikasi SIPD (Kemendagri).
 * Satu file PDF = satu Sub Kegiatan. Menghasilkan payload siap divalidasi oleh
 * rkaValidationService (schema sama dengan form manual/`POST /api/rka`).
 *
 * Header (Program/Kegiatan/Sub Kegiatan/Alokasi/dll) diparse dari teks flat
 * `pdf-parse` (baris "Label: Value" sangat reguler, aman di-regex per baris).
 *
 * Rincian belanja PER ITEM (sampai level Koefisien/Satuan/Harga/Spesifikasi)
 * diparse dari POSISI GLYPH (pdfjs-dist), bukan teks flat — karena kolom
 * Sebelum & Sesudah pada teks flat bergabung tanpa pemisah jelas. Tabel di
 * PDF ini punya kolom TETAP (x-position), jadi tiap glyph di-bucket ke kolom
 * terdekat berdasar x, lalu baris dikelompokkan berdasar y (toleransi lebar
 * karena ekspresi koefisien majemuk spt "30 Orang/Kamar x 3 Hari" bisa wrap
 * 2 baris dalam selnya sendiri).
 */

const pdfParse = require('pdf-parse');

// Label header yg dikenal di PDF cetak RKA SIPD. Dipakai untuk (1) menormalkan
// baris label yang terpisah dari titik-duanya (nama Sub Kegiatan/Kegiatan/dll
// yang panjang bisa membuat pdf-parse memecah "Label" dan ": value" jadi baris
// berbeda), dan (2) sebagai batas lookahead saat menangkap value yang wrap
// beberapa baris (termasuk diselingi baris kosong).
const KNOWN_LABELS = [
  'Urusan Pemerintahan', 'Bidang Urusan', 'Unit Organisasi', 'Sub Unit Organisasi',
  'Program', 'Kegiatan', 'Sub Kegiatan', 'SPM', 'Jenis Layanan', 'Sumber Pendanaan',
  'Lokasi', 'Waktu Pelaksanaan', 'Kelompok Sasaran',
];

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// "Label\n: value" (label sendirian di satu baris, ":" mulai baris berikutnya)
// -> "Label: value" (gabung jadi satu baris), supaya regex per-baris berikutnya
// tetap bisa dipakai apa adanya.
function normalizeWrappedLabels(text) {
  let out = text;
  for (const label of KNOWN_LABELS) {
    out = out.replace(new RegExp('^' + escRe(label) + '\\s*\\n\\s*:', 'gm'), label + ':');
  }
  return out;
}

// Batas keras tambahan yang TIDAK selalu diikuti titik dua (mis. "Kelompok
// Sasaran-" tanpa ":", "Alokasi 2025 :" pakai tahun di tengah, judul seksi
// "Indikator dan Tolak Ukur Kinerja Kegiatan") — kalau tidak dimasukkan,
// capture value bisa kebablasan jauh ke bawah dan overflow kolom DB.
const HARD_BOUNDARIES = [
  'Kelompok Sasaran',
  'Alokasi \\d{4}\\s*:',
  'Indikator dan Tolak Ukur Kinerja Kegiatan',
  'Rincian Anggaran Belanja Kegiatan',
];

// Ambil value suatu label, TAHAN terhadap value yang wrap beberapa baris
// (termasuk diselingi baris kosong) — berhenti pas ketemu label dikenal
// berikutnya (dgn/tanpa titik dua), bukan cuma akhir baris.
function grabField(text, label) {
  const labelBoundaries = KNOWN_LABELS.filter((l) => l !== label).map(escRe).map((l) => l + ':');
  const allBoundaries = [...labelBoundaries, ...HARD_BOUNDARIES].join('|');
  const re = new RegExp('^' + escRe(label) + ':\\s*([\\s\\S]*?)(?=\\n(?:' + allBoundaries + ')|(?![\\s\\S]))', 'm');
  const m = text.match(re);
  if (!m) return null;
  return m[1].replace(/\s+/g, ' ').trim();
}

function splitKodeNama(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^([\d.]+)\s+(.+)$/);
  if (m) return { kode: m[1], nama: m[2].trim() };
  return { kode: '', nama: s };
}

// Nominal Rupiah (harga_satuan/jumlah) SELALU pakai format Indonesia penuh
// "1.234.567,00" (titik=ribuan per-3-digit, koma=desimal, ada di semua angka
// termasuk yg genap tanpa sen). Tapi kolom Koefisien kadang berisi ANGKA DESIMAL
// pakai TITIK sbg tanda desimal, TANPA koma sama sekali (mis. "1.67 Paket" = 1,67
// unit, dikonfirmasi cocok dgn subtotal 1.67 x harga_satuan di PDF sumber) — bukan
// "167" hasil salah anggap titik sbg pemisah ribuan. Bedakan lewat pola grouping:
// pemisah ribuan Indonesia yg SAH selalu tepat 3 digit per grup ("1.234.567"),
// kalau tidak (mis. "1.67", "30.5") titik itu pasti desimal.
function toNumber(str) {
  if (!str) return 0;
  const s = String(str).trim();
  if (s.includes(',')) {
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  if (s.includes('.')) {
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
      const n = Number(s.replace(/\./g, ''));
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function mapSumberDana(text) {
  const s = String(text || '').toUpperCase();
  if (s.includes('DAK') && s.includes('NON')) return 'DAK Non Fisik';
  if (s.includes('DAK')) return 'DAK Fisik';
  if (s.includes('DAU')) return 'DAU';
  if (s.includes('DBH')) return 'DBH';
  return 'PAD';
}

// waktu_mulai/waktu_selesai di DB dibatasi VARCHAR(20) — jaga-jaga kalau parsing
// header di atas meleset (mis. varian format PDF lain) dan menangkap lebih dari
// yang seharusnya, potong daripada gagal INSERT.
function clampLen(s, max) {
  if (!s) return s;
  return s.length > max ? s.slice(0, max) : s;
}

function parseWaktu(waktu) {
  const s = String(waktu || '').trim();
  const m = s.match(/^(.+?)\s+s\.?d\.?\s+(.+)$/i);
  if (m) return { mulai: clampLen(m[1].trim(), 20), selesai: clampLen(m[2].trim(), 20) };
  return { mulai: clampLen(s, 20) || null, selesai: null };
}

// -------------------------------------------------------------------------
// Header (pdf-parse, teks flat)
// -------------------------------------------------------------------------
function parseHeader(rawText) {
  const text = normalizeWrappedLabels(rawText);

  const tahunMatch = text.match(/Tahun Anggaran (\d{4})/);
  const tahun = tahunMatch ? tahunMatch[1] : null;
  if (!tahun) throw new Error('Tahun anggaran tidak ditemukan di PDF — pastikan ini file cetak RKA SIPD yang valid.');

  const urusan = splitKodeNama(grabField(text, 'Urusan Pemerintahan'));
  const bidangUrusan = splitKodeNama(grabField(text, 'Bidang Urusan'));
  const program = splitKodeNama(grabField(text, 'Program'));
  const kegiatan = splitKodeNama(grabField(text, 'Kegiatan'));
  const subKegiatan = splitKodeNama(grabField(text, 'Sub Kegiatan'));
  if (!subKegiatan.kode) throw new Error('Kode Sub Kegiatan tidak ditemukan di PDF.');

  const sumberPendanaanRaw = grabField(text, 'Sumber Pendanaan');
  const sumberDanaDefault = mapSumberDana(sumberPendanaanRaw);
  const lokasiRaw = grabField(text, 'Lokasi');
  const lokasi = lokasiRaw && lokasiRaw !== '-' ? lokasiRaw : null;
  const waktu = parseWaktu(grabField(text, 'Waktu Pelaksanaan'));

  const alokasiMatch = text.match(new RegExp(`Alokasi ${tahun}\\s*:\\s*Rp\\.\\s*([\\d.,]+)`));
  const alokasi = alokasiMatch ? toNumber(alokasiMatch[1]) : null;

  const capaianMatch = text.match(/Capaian Program(-{1,2})Capaian Program/);
  const capaianProgram = capaianMatch ? '-' : null;

  // Satuan Keluaran bisa 1 kata ("Dokumen", nempel langsung ke "Keluaran"
  // berikutnya: "...2 DokumenKeluaran") ATAU beberapa kata dgn spasi (mis.
  // "Orang/ Bulan": "...61 Orang/ BulanKeluaran") — capture group satuan HARUS
  // lazy `[\s\S]*?` (bukan `\S+` yg cuma 1 token) spy kata kedua ("Bulan") ikut
  // tertangkap sebelum ketemu literal "Keluaran" penutup.
  const keluaranMatch = text.match(/Keluaran\s*\n?:\s*([\s\S]+?)\n(\d+(?:[.,]\d+)?)\s*([\s\S]*?)Keluaran/);
  const keluaran = keluaranMatch ? keluaranMatch[1].replace(/\s+/g, ' ').trim() : null;
  const targetKeluaran = keluaranMatch ? keluaranMatch[2] : null;
  const satuanKeluaran = keluaranMatch ? keluaranMatch[3].replace(/\s+/g, ' ').trim() : null;

  const hasilMatch = text.match(/Hasil:\s*(-{1,2})Hasil/);
  const hasil = hasilMatch ? '-' : null;

  return {
    tahun,
    urusan: urusan.nama || null,
    kode_urusan: urusan.kode || null,
    bidang_urusan: bidangUrusan.nama || null,
    kode_bidang_urusan: bidangUrusan.kode || null,
    program: program.nama,
    kode_program: program.kode,
    kegiatan: kegiatan.nama,
    kode_kegiatan: kegiatan.kode,
    sub_kegiatan: subKegiatan.nama,
    kode_sub_kegiatan: subKegiatan.kode,
    jenis_dokumen: 'RKA',
    capaian_program: capaianProgram,
    keluaran,
    target_keluaran: targetKeluaran,
    satuan_keluaran: satuanKeluaran,
    hasil,
    waktu_mulai: waktu.mulai,
    waktu_selesai: waktu.selesai,
    lokasi,
    sumber_dana_default: sumberDanaDefault,
    alokasi,
  };
}

// -------------------------------------------------------------------------
// Rincian belanja (pdfjs-dist, posisi glyph)
// -------------------------------------------------------------------------
const HEADER_STRINGS = new Set([
  // 'Kode' & 'Rekening' kadang jadi 1 token gabungan "Kode Rekening" tergantung
  // rendering PDF-nya (beda dari PDF sample lain yg memisah jadi 2 token) —
  // masukkan kedua varian supaya header tabel tetap terfilter di semua kasus.
  'Kode', 'Rekening', 'Kode Rekening', 'Uraian',
  'Rincian Perhitungan Sebelum', 'Rincian Perhitungan Sesudah',
  'Bertambah /', '(Berkurang)', '(Rp)',
  'Koefisien', 'Satuan', 'Harga (Rp)', 'PPN', 'Jumlah (Rp)',
  'Rincian Anggaran Belanja Sub Kegiatan', 'Satuan Kerja Perangkat Daerah',
]);

// Kalibrasi X ini terbukti BEDA antar PDF SIPD (mis. Belanja Pegawai/Gaji ASN
// punya tabel yg digeser ~20-50pt ke kiri dibanding Belanja Barang/Jasa) — dipakai
// HANYA sbg fallback kalau deteksi dinamis dari header tabel (`detectNumColumns`)
// gagal. Jangan andalkan angka-angka ini sbg satu-satunya sumber kebenaran.
const DEFAULT_NUM_COLUMNS = [
  { key: 'koef_sebelum', x: 458 },
  { key: 'satuan_sebelum', x: 521 },
  { key: 'harga_sebelum', x: 580 },
  { key: 'ppn_sebelum', x: 645 },
  { key: 'jumlah_sebelum', x: 710 },
  { key: 'koef_sesudah', x: 764 },
  { key: 'satuan_sesudah', x: 828 },
  { key: 'harga_sesudah', x: 887 },
  { key: 'ppn_sesudah', x: 951 },
  { key: 'jumlah_sesudah', x: 1015 },
  { key: 'delta', x: 1100 },
];

const NUM_COLUMN_KEYS_SEBELUM = ['koef_sebelum', 'satuan_sebelum', 'harga_sebelum', 'ppn_sebelum', 'jumlah_sebelum'];
const NUM_COLUMN_KEYS_SESUDAH = ['koef_sesudah', 'satuan_sesudah', 'harga_sesudah', 'ppn_sesudah', 'jumlah_sesudah'];
const NUM_COLUMN_HEADER_LABELS = ['Koefisien', 'Satuan', 'Harga (Rp)', 'PPN', 'Jumlah (Rp)'];

// Baca posisi X kolom Koefisien/Satuan/Harga/PPN/Jumlah LANGSUNG dari baris header
// tabel di halaman ini (bukan konstanta tetap) — beda PDF SIPD terbukti punya
// posisi X yg berbeda (lihat komentar DEFAULT_NUM_COLUMNS). Header selalu berisi
// 10 label dlm urutan tetap: [Koefisien,Satuan,Harga,PPN,Jumlah] x2 (Sebelum lalu
// Sesudah), diurutkan kiri-ke-kanan. Return null kalau tidak ketemu (fallback ke
// DEFAULT_NUM_COLUMNS di pemanggil).
function detectNumColumns(rawItems) {
  const koefCandidates = rawItems.filter((it) => it.str.trim() === 'Koefisien');
  if (koefCandidates.length === 0) return null;
  const headerY = koefCandidates[0].y;
  const tol = 4;
  const headerItems = rawItems.filter(
    (it) => Math.abs(it.y - headerY) <= tol && NUM_COLUMN_HEADER_LABELS.includes(it.str.trim()),
  );
  if (headerItems.length < 10) return null;
  const sorted = [...headerItems].sort((a, b) => a.x - b.x).slice(0, 10);
  const keys = [...NUM_COLUMN_KEYS_SEBELUM, ...NUM_COLUMN_KEYS_SESUDAH];
  const columns = keys.map((key, idx) => ({ key, x: sorted[idx].x }));
  const jumlahSesudah = columns.find((c) => c.key === 'jumlah_sesudah');
  const ppnSesudah = columns.find((c) => c.key === 'ppn_sesudah');
  const spacing = jumlahSesudah.x - ppnSesudah.x;
  // Kolom "delta" (Bertambah/Berkurang) tidak punya label 1-kata yg gampang
  // dideteksi (teksnya "Bertambah /" + "(Berkurang)" + "(Rp)" terpisah baris) dan
  // nilainya toh tidak pernah dibaca di kode ini — cukup taruh jauh di kanan
  // jumlah_sesudah spy glyph delta tidak nyasar ke kolom jumlah_sesudah.
  columns.push({ key: 'delta', x: jumlahSesudah.x + Math.max(spacing, 40) * 2 });
  return columns;
}

function nearestColumn(x, columns) {
  const cols = columns || DEFAULT_NUM_COLUMNS;
  let best = cols[0];
  let bestDist = Infinity;
  for (const c of cols) {
    const d = Math.abs(c.x - x);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best.key;
}

function clusterRows(items, tol) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  for (const it of sorted) {
    let row = rows.find((r) => Math.abs(r.anchorY - it.y) <= tol);
    if (!row) { row = { anchorY: it.y, items: [] }; rows.push(row); }
    row.items.push(it);
  }
  rows.sort((a, b) => b.anchorY - a.anchorY);
  return rows;
}

function buildNumRowCells(rowItems, columns) {
  const byCol = {};
  for (const it of rowItems) {
    const col = nearestColumn(it.x, columns);
    if (!byCol[col]) byCol[col] = [];
    byCol[col].push(it);
  }
  const cells = {};
  for (const col of Object.keys(byCol)) {
    cells[col] = byCol[col].sort((a, b) => b.y - a.y).map((it) => it.str).join(' ').trim();
  }
  return cells;
}

// "1 Paket" / "2 Hari x 1 Kali" / "30 Orang /Kamar x 3 Hari" -> [{volume, satuan}]
function parseKoefisienExpr(expr, fallbackSatuan) {
  const s = String(expr || '').trim();
  if (!s || s === '-') return [{ volume: 0, satuan: fallbackSatuan || 'Paket' }];
  const parts = s.split(/\s*x\s*/i);
  const out = [];
  for (const p of parts) {
    const m = p.trim().match(/^([\d.,]+)\s*(.*)$/);
    if (m && m[1]) {
      // Buang sisa fragmen angka tunggal ("0") yg kadang nyasar ikut ke sel
      // Satuan akibat pembulatan desimal Rupiah terpecah antar-kolom di posisi X
      // yg berdekatan — satuan asli (Tahun/Orang/dll) tidak pernah diakhiri digit.
      const satuanClean = (m[2] || '').replace(/\s+\d+$/, '').trim();
      out.push({ volume: toNumber(m[1]) || 1, satuan: satuanClean || fallbackSatuan || 'Paket' });
    }
    else if (p.trim()) out.push({ volume: 1, satuan: p.trim() });
  }
  return out.length ? out : [{ volume: 1, satuan: fallbackSatuan || 'Paket' }];
}

async function extractPageItems(doc, pageNum) {
  const page = await doc.getPage(pageNum);
  const content = await page.getTextContent();
  return content.items
    .map((it) => ({ str: it.str, x: it.transform[4], y: Math.round(it.transform[5]) }))
    .filter((it) => it.str.trim() !== '');
}

async function parseRincianBelanja(buffer, sumberDanaDefault) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const leafItems = [];
  let currentKode = null;
  let currentKodeNamaRekening = null;
  let currentSumberDana = sumberDanaDefault;
  let urutan = 1;
  // Baris "Kode Rekening" pertama menandai mulainya tabel rincian belanja — teks
  // sebelum itu (identitas dokumen, dll di halaman 1) tidak boleh ikut dianggap
  // item leaf oleh fallback tanpa-Spesifikasi di bawah.
  let sawAnyKode = false;
  // Begitu marker akhir tabel ("Jumlah Anggaran Sub Kegiatan") ditemukan di suatu
  // halaman, halaman-halaman SESUDAHNYA (mis. lembar tanda tangan TAPD) bukan lagi
  // bagian rincian belanja — hentikan looping, jangan diproses sbg data.
  let reachedTableEnd = false;
  // Posisi X kolom Koefisien/Satuan/Harga/PPN/Jumlah dideteksi SEKALI dari header
  // tabel halaman pertama yg ketemu (lihat komentar detectNumColumns) — dipakai
  // konsisten sepanjang dokumen ini, bukan konstanta tetap.
  let numColumns = null;

  for (let p = 1; p <= doc.numPages; p++) {
    if (reachedTableEnd) break;
    const raw = await extractPageItems(doc, p);
    if (!numColumns) numColumns = detectNumColumns(raw) || DEFAULT_NUM_COLUMNS;
    const localStart = raw.findIndex((it) => it.str === 'Kode' && it.x < 100);
    const localEnd = raw.findIndex((it) => it.str.includes('Jumlah Anggaran Sub Kegiatan'));
    if (localEnd !== -1) reachedTableEnd = true;
    const items = raw
      .slice(localStart === -1 ? 0 : localStart, localEnd === -1 ? raw.length : localEnd)
      .filter((it) => !HEADER_STRINGS.has(it.str.trim()));

    const textItems = items.filter((it) => it.x < 450);
    const numItems = items.filter((it) => it.x >= 450);
    const textRows = clusterRows(textItems, 3);
    const numRowsRaw = clusterRows(numItems, 16).map((r) => ({
      y: r.items.reduce((s, it) => s + it.y, 0) / r.items.length,
      cells: buildNumRowCells(r.items, numColumns),
      used: false,
    }));
    const isLeafRow = (cells) => Boolean(cells.satuan_sebelum || cells.satuan_sesudah);

    const lines = textRows.map((r) => {
      const kodeItem = r.items.find((it) => it.x < 55 && /^5[\d.]*$/.test(it.str));
      const rest = r.items.filter((it) => it !== kodeItem).map((it) => it.str).join(' ').trim();
      return { y: r.anchorY, kode: kodeItem ? kodeItem.str : null, text: rest };
    });

    const anchors = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.kode) {
        sawAnyKode = true;
        anchors.push({ type: 'struct', y: line.y, kind: 'kode', kode: line.kode, namaRekening: line.text });
        i++;
        continue;
      }
      if (line.text.startsWith('[ # ]')) {
        let sumberDana = null;
        let yEnd = line.y;
        if (i + 1 < lines.length && lines[i + 1].text.startsWith('Sumber Dana')) {
          sumberDana = lines[i + 1].text.replace(/^Sumber Dana\s*:\s*/, '').trim();
          yEnd = lines[i + 1].y;
          i += 2;
        } else i++;
        anchors.push({ type: 'struct', y: (line.y + yEnd) / 2, kind: 'group', sumberDana });
        continue;
      }
      if (line.text.startsWith('[ - ]')) {
        anchors.push({ type: 'struct', y: line.y, kind: 'subgroup' });
        i++;
        continue;
      }
      if (line.text.startsWith('Spesifikasi')) { i++; continue; }
      // Nama item bisa wrap ke beberapa baris sebelum "Spesifikasi :" muncul —
      // kumpulkan semua baris teks polos berturut-turut sebagai satu uraian.
      {
        const nameLines = [line];
        let j = i + 1;
        while (
          j < lines.length &&
          !lines[j].kode &&
          !lines[j].text.startsWith('[ # ]') &&
          !lines[j].text.startsWith('[ - ]') &&
          !lines[j].text.startsWith('Spesifikasi')
        ) {
          nameLines.push(lines[j]);
          j++;
        }
        if (j < lines.length && lines[j].text.startsWith('Spesifikasi')) {
          const specLine = lines[j];
          const spesifikasi = specLine.text.replace(/^Spesifikasi\s*:\s*/, '').trim();
          const uraian = nameLines.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim();
          const anchorY = (nameLines[nameLines.length - 1].y + specLine.y) / 2;
          anchors.push({
            type: 'leaf', y: anchorY, kind: 'leaf',
            uraian, spesifikasi: spesifikasi === '-' ? null : spesifikasi,
          });
          i = j + 1;
          continue;
        }
        // Tidak ada baris "Spesifikasi :" sesudahnya — normal utk rekening Belanja
        // Pegawai/Gaji (mis. "Belanja Gaji Pokok PNS"), SIPD tidak mewajibkan field
        // ini utk item personil. Tetap perlakukan nameLines sbg satu item leaf,
        // batasnya kode/[ # ]/[ - ] berikutnya (atau akhir baris) yg sudah dicapai `j`.
        // HANYA kalau sudah pernah lihat baris kode rekening (sawAnyKode) — kalau
        // belum, ini teks identitas dokumen di awal halaman 1 (Urusan/Program/dll),
        // bukan item belanja, jangan dianggap leaf.
        const uraian = nameLines.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim();
        if (uraian && sawAnyKode) {
          anchors.push({
            type: 'leaf', y: nameLines[nameLines.length - 1].y, kind: 'leaf',
            uraian, spesifikasi: null,
          });
        }
        i = j;
        continue;
      }
    }

    for (const anchor of anchors) {
      const wantLeaf = anchor.type === 'leaf';
      const pool = numRowsRaw.filter((r) => !r.used && isLeafRow(r.cells) === wantLeaf);
      let best = null, bestDist = Infinity;
      for (const row of pool) {
        const d = Math.abs(row.y - anchor.y);
        if (d < bestDist) { bestDist = d; best = row; }
      }
      if (best) { best.used = true; anchor.row = best; }
    }

    for (const anchor of anchors) {
      if (anchor.kind === 'kode') {
        currentKode = anchor.kode;
        currentKodeNamaRekening = anchor.namaRekening || null;
      }
      if (anchor.kind === 'group' && anchor.sumberDana) currentSumberDana = anchor.sumberDana;
      if (anchor.kind === 'leaf' && anchor.row) {
        const c = anchor.row.cells;
        const jumlah = toNumber(c.jumlah_sesudah);
        if (jumlah <= 0) continue; // baris kosong/tidak dipakai di RKA sumber
        const hargaSatuan = toNumber(c.harga_sesudah);
        leafItems.push({
          urutan: urutan++,
          kode_rekening: currentKode,
          nama_rekening: currentKodeNamaRekening || anchor.uraian,
          uraian: anchor.uraian,
          spesifikasi: anchor.spesifikasi,
          harga_satuan: hargaSatuan,
          sumber_dana: mapSumberDana(currentSumberDana),
          lokasi: null,
          keterangan: 'Diimpor otomatis dari PDF Cetak RKA SIPD.',
          koefisien_array: parseKoefisienExpr(c.koef_sesudah, c.satuan_sesudah),
        });
      }
    }
  }

  return leafItems;
}

// -------------------------------------------------------------------------
async function parseSipdRkaPdf(buffer) {
  const { text } = await pdfParse(buffer);
  const header = parseHeader(text);

  const rincianBelanja = await parseRincianBelanja(buffer, header.sumber_dana_default);
  if (rincianBelanja.length === 0) {
    throw new Error('Tidak ditemukan rincian belanja (baris item) di PDF ini.');
  }

  const totalRincian = rincianBelanja.reduce(
    (s, r) => s + r.harga_satuan * r.koefisien_array.reduce((a, k) => a * (k.volume > 0 ? k.volume : 1), 1),
    0,
  );

  const { sumber_dana_default, alokasi, ...rkaFields } = header;

  return {
    ...rkaFields,
    rincian_belanja: rincianBelanja,
    _meta: {
      alokasi_pdf: alokasi,
      total_rincian_terhitung: totalRincian,
      selisih_vs_alokasi_pdf: alokasi != null ? Math.round((totalRincian - alokasi) * 100) / 100 : null,
      jumlah_baris_rincian: rincianBelanja.length,
    },
  };
}

module.exports = { parseSipdRkaPdf, mapSumberDana, splitKodeNama };
