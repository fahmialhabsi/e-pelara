"use strict";

/**
 * Parser PDF "MATRIKS PEMANTAUAN TINDAK LANJUT HASIL PEMERIKSAAN BPK RI
 * PERWAKILAN MALUKU UTARA" (format resmi Inspektorat Prov. Maluku Utara).
 *
 * BEDA dari realisasiSipdPdfImportService.js: PDF ini PUNYA lapisan teks asli
 * (bukan hasil scan/gambar) — dikonfirmasi lewat pdfjs-dist getTextContent()
 * langsung mengembalikan teks + posisi x/y per token, tanpa perlu render+OCR.
 *
 * Tantangan tabel: teks tiap sel TIDAK keluar per-baris fisik berurutan —
 * kolom "Uraian Rekomendasi" & "Rencana Aksi" dkk berupa blok multi-baris
 * yang posisinya membentang jauh secara vertikal (satu sel bisa >10 baris
 * teks), sementara kolom pendek (No/Jml/Nilai/Setor/Sisa/Status/SPJ) cuma
 * 1 baris. Solusi: deteksi baris ANCHOR (baris Temuan = token angka murni di
 * kolom No; baris Rekomendasi = token huruf a-f di kolom Uraian Rekomendasi),
 * lalu setiap token lain di-assign ke anchor terdekat secara Y *dalam rentang
 * X kolom yang sama*.
 *
 * PENTING — batas kolom TIDAK dihardcode: dikalibrasi ULANG per HALAMAN dari
 * baris header angka kolom ("1 2 3 4 5 6 7 8 9 10 11 12 13 15", muncul di
 * pdfjs sbg token TERPISAH per angka) yang dicetak Inspektorat di setiap
 * halaman tabel. Ditemukan 2026-07-26: lebar kolom "Uraian Rekomendasi"
 * BERBEDA antar dokumen (kemungkinan auto-fit export Excel/Word tergantung
 * panjang teks), sehingga batas absolut hasil kalibrasi 1 dokumen TERBUKTI
 * salah baca di dokumen lain — kalibrasi dinamis per halaman jauh lebih
 * tahan terhadap variasi ini drpd posisi X tetap.
 */

// Nomor kolom resmi -> key internal. Kolom 12 ("Status") sebenarnya 4
// sub-kolom (N/Ad/SPJ.N/SPJ.Ad) yg TIDAK punya nomor sendiri — dipecah rata
// dari rentang kolom 12. Nomor 14 memang tidak ada di dokumen asli (dilewati
// Inspektorat sendiri, kemungkinan bekas kolom yg dihapus dari template).
const HEADER_NUMBER_TO_KEY = {
  1: "no",
  2: "uraian_temuan",
  3: "jml_temuan",
  4: "nilai_temuan",
  5: "uraian_rekomendasi",
  6: "jml_rekomendasi",
  7: "nilai_rekomendasi",
  8: "sesuai",
  9: "uraian_tindak_lanjut",
  10: "setor",
  11: "sisa",
  12: "__status_group__",
  13: "rencana_aksi",
  15: "ket",
};

const HEADER_NUMBERS_SORTED = Object.keys(HEADER_NUMBER_TO_KEY)
  .map(Number)
  .sort((a, b) => a - b);

// Angka header yg PALING TIDAK MUNGKIN muncul apa adanya di baris data asli
// (kolom Status/SPJ isinya cuma "0"/"1", kolom Jml cuma "1") — dipakai utk
// mendeteksi baris header di suatu halaman scr presisi.
const DISTINCTIVE_HEADER_NUMBERS = ["10", "11", "13", "15"];

const NOISE_TEXTS = new Set([
  "No",
  "Temuan Pemeriksaan",
  "Rekomendasi",
  "Tindak Lanjut",
  "Setor",
  "Sisa",
  "Status",
  "Ket",
  "Uraian",
  "Jml",
  "Nilai",
  "Sesuai",
  "Rencana Aksi",
  "N",
  "Ad",
  "SPJ",
]);

const HEADER_NUMBER_LINE = /^\d+(?:\d+)*$/; // baris "1234678910111315" (kalau pdf-parse gabung jadi 1 string, bukan pdfjs)

const isTemuanAnchorText = (text) => /^\d{1,3}$/.test(text.trim());
const isRekomendasiLetterText = (text) => /^[a-f]\.?$/i.test(text.trim());

// Format Rupiah di dokumen ini: "8,794,910.70" — koma = pemisah ribuan,
// titik = desimal (gaya AS), BUKAN gaya Indonesia (titik ribuan/koma
// desimal) — dikonfirmasi dari nilai nyata di kedua PDF contoh resmi.
const parseRupiahToken = (text) => {
  const clean = String(text || "").trim();
  if (!clean || clean === "-") return null;
  const numeric = clean.replace(/[^\d.-]/g, "").replace(/,/g, "");
  const n = Number(numeric);
  return Number.isFinite(n) && numeric !== "" ? n : null;
};

const cleanJoinedText = (parts) =>
  parts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();

/**
 * Cari baris header angka kolom pada SATU halaman, kembalikan {nomor: x}
 * (posisi x TENGAH tiap angka header). Return null kalau tidak ketemu.
 */
const detectHeaderPositionsForPage = (pageTokens) => {
  const numericTokens = pageTokens.filter((t) => /^\d{1,2}$/.test(t.text.trim()));

  const rowGroups = new Map();
  numericTokens.forEach((t) => {
    const key = Math.round(t.y / 3);
    if (!rowGroups.has(key)) rowGroups.set(key, []);
    rowGroups.get(key).push(t);
  });

  let headerRow = null;
  rowGroups.forEach((rowTokens) => {
    const hasDistinctive = rowTokens.some((t) => DISTINCTIVE_HEADER_NUMBERS.includes(t.text.trim()));
    if (hasDistinctive && (!headerRow || rowTokens.length > headerRow.length)) headerRow = rowTokens;
  });

  if (!headerRow) return null;

  const positions = {};
  headerRow.forEach((t) => {
    const n = Number(t.text.trim());
    if (HEADER_NUMBER_TO_KEY[n] !== undefined) positions[n] = t.xc ?? t.x;
  });

  return Object.keys(positions).length >= 6 ? positions : null;
};

/**
 * Bangun daftar batas kolom {key,xMin,xMax} dari posisi header 1 halaman.
 * Batas antar kolom = titik tengah dua posisi header berurutan. Kolom 12
 * (Status) dipecah rata jadi 4 sub-kolom. Huruf sub-item Rekomendasi (a-f)
 * TIDAK punya kolom sendiri di sini — dideteksi terpisah lewat pola teks di
 * dalam wilayah kolom uraian_rekomendasi (lihat rekomendasiAnchorsRaw).
 */
const buildColumnBoundariesFromPositions = (positions) => {
  const known = HEADER_NUMBERS_SORTED.filter((n) => positions[n] !== undefined);
  if (known.length < 2) return null;

  const midpoint = (a, b) => (a + b) / 2;
  const boundsFor = (n) => {
    const idx = known.indexOf(n);
    const prev = idx > 0 ? positions[known[idx - 1]] : null;
    const next = idx < known.length - 1 ? positions[known[idx + 1]] : null;
    const gapBefore = prev !== null ? positions[n] - prev : (next !== null ? next - positions[n] : 40);
    const gapAfter = next !== null ? next - positions[n] : gapBefore;
    return {
      xMin: prev !== null ? midpoint(prev, positions[n]) : positions[n] - gapBefore / 2,
      xMax: next !== null ? midpoint(positions[n], next) : positions[n] + gapAfter,
    };
  };

  const columns = [];

  // PENTING: kolom "No" SELALU angka pendek (1-3 digit) rapat ke margin kiri
  // — beda dari kolom teks lebar di sebelah kanannya (uraian_temuan), yang
  // header-nya (angka "2") posisinya nempel di TENGAH label "Uraian" yg
  // terentang lebar, JAUH dari titik mulai teks paragraf sebenarnya (teks
  // wrap kiri mulai tepat setelah kolom No berakhir, bukan di sekitar posisi
  // header "2"). Kalau batas kolom "No" dihitung pakai midpoint umum (sampai
  // ke tengah antara header "1" dan "2"), kata PENDEK di baris wrap paling
  // bawah kolom uraian_temuan (mis. "Memadai" - satu kata, xc-nya ketarik
  // dekat margin kiri krn rata-kiri) bisa salah 'ketelan' jadi kolom No.
  // Fix: beri "No" jendela SEMPIT TETAP di sekitar posisi header-nya,
  // sisanya (sampai batas kolom Jml Temuan berikutnya) jadi milik
  // uraian_temuan — supaya kata pendek apa pun di kolom uraian_temuan tetap
  // aman diklasifikasi benar walau xc-nya dekat margin kiri.
  const noPos = positions[1];
  const noBounds = noPos !== undefined ? { xMin: noPos - 15, xMax: noPos + 20 } : null;

  known.forEach((n) => {
    const key = HEADER_NUMBER_TO_KEY[n];
    let { xMin, xMax } = boundsFor(n);

    if (key === "no" && noBounds) {
      xMax = noBounds.xMax;
    }
    if (key === "uraian_temuan" && noBounds) {
      xMin = noBounds.xMax;
    }

    if (key === "__status_group__") {
      const quarter = (xMax - xMin) / 4;
      columns.push({ key: "status_n", xMin, xMax: xMin + quarter });
      columns.push({ key: "status_ad", xMin: xMin + quarter, xMax: xMin + quarter * 2 });
      columns.push({ key: "spj_n", xMin: xMin + quarter * 2, xMax: xMin + quarter * 3 });
      columns.push({ key: "spj_ad", xMin: xMin + quarter * 3, xMax });
      return;
    }

    columns.push({ key, xMin, xMax });
  });

  return columns;
};

// PENTING: nilai numerik (Rupiah) di dokumen ini RATA KANAN dalam selnya —
// token lebar spt "8,794,910.70" bisa MULAI jauh di kiri batas kolom nominal.
// Klasifikasi kolom karena itu pakai X-TENGAH token (start + width/2), bukan
// X-awal — cocok utk teks pendek rata-kiri (huruf sub-item/angka status)
// MAUPUN angka lebar rata-kanan sekaligus.
const columnForToken = (t, columnsByPage, fallbackColumns) => {
  const columns = columnsByPage.get(t.page) || fallbackColumns;
  if (!columns) return null;
  const xc = t.xc ?? t.x;
  return columns.find((c) => xc >= c.xMin && xc < c.xMax) || null;
};

/**
 * @param {Array<{text:string,x:number,xc:number,y:number,page:number}>} allTokens
 * @param {Map<number, Array>} columnsByPage
 */
const parseTokensToEntries = (allTokens, columnsByPage) => {
  const fallbackColumns = columnsByPage.values().next().value || null;
  const col = (t) => columnForToken(t, columnsByPage, fallbackColumns);
  const seq = (t) => t.page * 1_000_000 - t.y;

  let filtered = allTokens.filter((t) => {
    const text = String(t.text || "").trim();
    if (!text) return false;
    if (NOISE_TEXTS.has(text)) return false;
    if (HEADER_NUMBER_LINE.test(text) && text.length > 3) return false;
    return true;
  });

  // --- Buang baris header angka kolom itu sendiri dari daftar token data ---
  const rowGroups = new Map();
  filtered.forEach((t) => {
    const key = `${t.page}:${Math.round(t.y / 3)}`;
    if (!rowGroups.has(key)) rowGroups.set(key, []);
    rowGroups.get(key).push(t);
  });

  const headerRowKeys = new Set();
  rowGroups.forEach((rowTokens, key) => {
    const hasDistinctive = rowTokens.some((t) => DISTINCTIVE_HEADER_NUMBERS.includes(t.text.trim()));
    if (hasDistinctive) headerRowKeys.add(key);
  });

  filtered = filtered.filter((t) => !headerRowKeys.has(`${t.page}:${Math.round(t.y / 3)}`));

  // --- Buang blok penutup/tanda tangan (semuanya SETELAH baris total "Jumlah") ---
  const jumlahToken = filtered.find((t) => t.text.trim() === "Jumlah");
  const tokens = jumlahToken ? filtered.filter((t) => seq(t) < seq(jumlahToken)) : filtered;

  // --- 1. Deteksi anchor Temuan: token angka murni di kolom "no" ---
  const temuanAnchors = tokens.filter((t) => {
    const c = col(t);
    return c?.key === "no" && isTemuanAnchorText(t.text);
  });
  temuanAnchors.sort((a, b) => (a.page !== b.page ? a.page - b.page : b.y - a.y));

  if (!temuanAnchors.length) return [];

  // --- 2. Deteksi anchor Rekomendasi (huruf a-f) per Temuan ---
  // PENTING: huruf sub-item (a-f) dideteksi lewat POLA TEKS (huruf tunggal
  // a-f, opsional titik) di dalam wilayah GABUNGAN kolom uraian_rekomendasi +
  // jml_rekomendasi (bukan sub-pita X sempit) — huruf itu sendiri nempel di
  // kiri kolom uraian_rekomendasi, tapi posisi X presisinya bisa geser
  // sedikit antar dokumen (lebar kolom auto-fit berbeda), sementara pola
  // teksnya (huruf tunggal a-f) sangat spesifik & jarang salah kena teks
  // uraian yg panjang.
  const rekomendasiAnchorsRaw = tokens
    .filter((t) => {
      if (!isRekomendasiLetterText(t.text)) return false;
      const columns = columnsByPage.get(t.page) || fallbackColumns;
      if (!columns) return false;
      const uraianRekCol = columns.find((c) => c.key === "uraian_rekomendasi");
      const jmlRekCol = columns.find((c) => c.key === "jml_rekomendasi");
      if (!uraianRekCol) return false;
      const xc = t.xc ?? t.x;
      const rangeMax = jmlRekCol ? jmlRekCol.xMax : uraianRekCol.xMax;
      // Marka huruf (list marker "a."/"b") kerap sedikit MENJOROK KE KIRI dari
      // batas xMin nominal kolom uraian_rekomendasi (gaya hanging-indent) —
      // beri margin longgar ke kiri supaya tidak terlewat krn kalibrasi geser
      // beberapa poin (ditemukan nyata: marker @xc~239 vs xMin terhitung 245.7).
      const rangeMin = uraianRekCol.xMin - 20;
      return xc >= rangeMin && xc < rangeMax;
    })
    .sort((a, b) => (a.page !== b.page ? a.page - b.page : b.y - a.y));

  const entries = temuanAnchors.map((anchor, idx) => {
    const startSeq = seq(anchor);
    const endSeq = idx + 1 < temuanAnchors.length ? seq(temuanAnchors[idx + 1]) : Infinity;

    const rekLettersInRange = rekomendasiAnchorsRaw.filter((r) => {
      const s = seq(r);
      return s >= startSeq && s < endSeq;
    });

    // CATATAN: sempat dicoba membatasi rentang Uraian/Nilai Temuan sampai
    // anchor huruf rekomendasi PERTAMA (asumsi: teks Temuan selalu selesai
    // sebelum baris Rekomendasi mulai) — TERBUKTI SALAH & regresi lebih
    // parah: kolom Uraian Rekomendasi & Uraian Temuan render PARALEL (huruf
    // "b" bisa muncul di Y yg lebih rendah dari SEBAGIAN wrap teks Temuan,
    // krn masing-masing kolom bungkus baris independen). Balik pakai endSeq
    // (anchor Temuan berikutnya) apa adanya — duplikasi lintas-halaman langka
    // (spt kasus Temuan 6 PDF2) diterima sbg keterbatasan yg terdokumentasi,
    // drpd memotong teks Temuan lain yg justru sudah benar.
    const uraianTemuanTokens = tokens.filter((t) => {
      const c = col(t);
      if (c?.key !== "uraian_temuan") return false;
      const s = seq(t);
      return s >= startSeq - 2 && s < endSeq;
    });

    const nilaiTemuanTokens = tokens.filter((t) => {
      const c = col(t);
      if (c?.key !== "nilai_temuan") return false;
      const s = seq(t);
      return s >= startSeq - 2 && s < endSeq;
    });

    const uraianTemuan = cleanJoinedText(
      [...uraianTemuanTokens]
        .sort((a, b) => (a.page !== b.page ? a.page - b.page : b.y - a.y) || a.x - b.x)
        .map((t) => t.text),
    );
    const nilaiTemuanValues = nilaiTemuanTokens.map((t) => parseRupiahToken(t.text)).filter((v) => v !== null);
    const nilaiTemuan = nilaiTemuanValues.length ? nilaiTemuanValues[0] : null;

    const rekomendasiAnchors = rekLettersInRange.length
      ? rekLettersInRange
      : [{ text: "a", x: anchor.x + 220, xc: anchor.x + 222, y: anchor.y, page: anchor.page }]; // temuan tanpa huruf sub-item eksplisit -> 1 rekomendasi implisit

    const rekomendasiList = rekomendasiAnchors.map((rAnchor, rIdx) => {
      const rStartSeq = seq(rAnchor);
      const rEndSeq = rIdx + 1 < rekomendasiAnchors.length ? seq(rekomendasiAnchors[rIdx + 1]) : endSeq;

      const colTokensInRange = (colKey) =>
        tokens.filter((t) => {
          const c = col(t);
          if (c?.key !== colKey) return false;
          const s = seq(t);
          return s >= rStartSeq - 1 && s < rEndSeq;
        });

      const joinedCol = (colKey) =>
        cleanJoinedText(
          colTokensInRange(colKey)
            .sort((a, b) => (a.page !== b.page ? a.page - b.page : b.y - a.y) || a.x - b.x)
            .map((t) => t.text),
        );

      const firstNumericCol = (colKey) => {
        const vals = colTokensInRange(colKey).map((t) => parseRupiahToken(t.text)).filter((v) => v !== null);
        return vals.length ? vals[0] : null;
      };

      const firstFlagCol = (colKey) => {
        const found = colTokensInRange(colKey).find((t) => /^[01]$/.test(t.text.trim()));
        return found ? found.text.trim() === "1" : null;
      };

      return {
        huruf: rAnchor.text.replace(/\.$/, ""),
        uraian_rekomendasi: joinedCol("uraian_rekomendasi"),
        nilai_rekomendasi: firstNumericCol("nilai_rekomendasi"),
        sesuai: firstFlagCol("sesuai"),
        uraian_tindak_lanjut: joinedCol("uraian_tindak_lanjut"),
        setor: firstNumericCol("setor"),
        sisa: firstNumericCol("sisa"),
        status_n: firstFlagCol("status_n"),
        status_ad: firstFlagCol("status_ad"),
        spj_n: firstFlagCol("spj_n"),
        spj_ad: firstFlagCol("spj_ad"),
        rencana_aksi: joinedCol("rencana_aksi"),
        ket: joinedCol("ket"),
      };
    });

    return {
      no: anchor.text.trim(),
      uraian_temuan: uraianTemuan,
      nilai_temuan: nilaiTemuan,
      rekomendasi: rekomendasiList,
    };
  });

  return { entries, col };
};

/**
 * Deteksi label grup ("LKPD 2025", "KETAHANAN PANGAN TAHUN 2020 SD SEMESTER I
 * 2025", dst) — baris teks pendek ALL-CAPS di kolom paling kiri, di ATAS
 * anchor Temuan pertama pada grup itu. Dipakai sbg petunjuk jenis_pemeriksaan
 * (LKPD = Pemeriksaan Keuangan, selain itu = Pemeriksaan Kinerja) per Temuan.
 */
const detectGroupLabelForTemuan = (allTokens, temuanAnchor) => {
  const seq = (t) => t.page * 1_000_000 - t.y;
  const anchorSeq = seq(temuanAnchor);

  const candidates = allTokens.filter((t) => {
    const text = String(t.text || "").trim();
    if (!text || text.length < 4) return false;
    if (t.x > 60) return false; // label grup nempel kolom paling kiri
    if (!/^[A-Z0-9 .-]+$/.test(text)) return false;
    if (/^\d+$/.test(text)) return false;
    return seq(t) <= anchorSeq;
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => seq(b) - seq(a)); // ambil yg PALING DEKAT (seq terbesar tapi <= anchorSeq)
  return candidates[0].text.trim();
};

const resolveJenisPemeriksaan = (groupLabel) => {
  if (!groupLabel) return null;
  const upper = groupLabel.toUpperCase();
  if (upper.includes("LKPD")) return "Pemeriksaan Keuangan";
  return "Pemeriksaan Kinerja";
};

/**
 * @param {Buffer} buffer
 * @returns {Promise<{ skpd: string|null, entries: Array, _meta: object }>}
 */
const parseTlhpMatriksPdf = async (buffer) => {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const allTokens = [];
  const tokensByPage = new Map();
  let skpd = null;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageTokens = [];

    content.items.forEach((item) => {
      const text = String(item.str || "").trim();
      if (!text) return;

      const x = item.transform[4];
      const y = item.transform[5];
      const xc = x + (item.width || 0) / 2;

      if (!skpd) {
        const skpdMatch = text.match(/^SKPD\s*:\s*(.+)$/i);
        if (skpdMatch) skpd = skpdMatch[1].trim();
      }

      const token = { text, x, xc, y, page: pageNum };
      allTokens.push(token);
      pageTokens.push(token);
    });

    tokensByPage.set(pageNum, pageTokens);
  }

  if (!skpd) {
    throw Object.assign(
      new Error(
        'Format PDF tidak dikenali: baris "SKPD :" tidak ditemukan. Pastikan file adalah Matriks Pemantauan TLHP resmi Inspektorat Provinsi Maluku Utara.',
      ),
      { status: 422 },
    );
  }

  // Kalibrasi batas kolom PER HALAMAN dari baris header angka kolom
  // masing-masing halaman (lihat catatan kalibrasi dinamis di atas).
  const columnsByPage = new Map();
  tokensByPage.forEach((pageTokens, pageNum) => {
    const positions = detectHeaderPositionsForPage(pageTokens);
    if (positions) {
      const columns = buildColumnBoundariesFromPositions(positions);
      if (columns) columnsByPage.set(pageNum, columns);
    }
  });

  if (!columnsByPage.size) {
    throw Object.assign(
      new Error(
        "Baris header kolom (nomor 1-15) tidak ditemukan di halaman manapun — format tabel tidak dikenali sebagai Matriks Pemantauan TLHP resmi.",
      ),
      { status: 422 },
    );
  }

  // Halaman yg headernya tidak terdeteksi (jarang, mis. tabel lanjut tanpa
  // header berulang) pakai kalibrasi dari halaman terdekat yg SUDAH ada.
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    if (columnsByPage.has(pageNum)) continue;
    let nearest = null;
    let nearestDist = Infinity;
    columnsByPage.forEach((_, p) => {
      const dist = Math.abs(p - pageNum);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = p;
      }
    });
    if (nearest !== null) columnsByPage.set(pageNum, columnsByPage.get(nearest));
  }

  const parsed = parseTokensToEntries(allTokens, columnsByPage);
  const { entries, col } = parsed;

  if (!entries.length) {
    throw Object.assign(
      new Error("Tidak ada baris Temuan yang berhasil terbaca dari PDF ini. Cek kembali format dokumen."),
      { status: 422 },
    );
  }

  const temuanAnchorTokens = allTokens.filter((t) => {
    const c = col(t);
    return c?.key === "no" && isTemuanAnchorText(t.text);
  });

  const entriesWithGroup = entries.map((entry) => {
    const anchorToken = temuanAnchorTokens.find((t) => t.text.trim() === entry.no) || temuanAnchorTokens[0];
    const groupLabel = detectGroupLabelForTemuan(allTokens, anchorToken);
    return {
      ...entry,
      group_label: groupLabel,
      jenis_pemeriksaan: resolveJenisPemeriksaan(groupLabel),
    };
  });

  return {
    skpd,
    entries: entriesWithGroup,
    _meta: {
      jumlah_halaman: doc.numPages,
      jumlah_temuan_terbaca: entries.length,
      jumlah_rekomendasi_terbaca: entries.reduce((s, e) => s + e.rekomendasi.length, 0),
      halaman_terkalibrasi: [...columnsByPage.keys()].sort((a, b) => a - b),
    },
  };
};

module.exports = { parseTlhpMatriksPdf };
