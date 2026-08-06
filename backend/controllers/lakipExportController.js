/**
 * lakipExportController.js
 * Export LAKIP/LKj ke PDF (puppeteer) dan DOCX (html-to-docx).
 *
 * Reuse HTML dari lakipGeneratorController.preview — tidak ada duplikasi logic.
 *
 * Endpoints:
 *   GET /api/lakip-generator/export/pdf?tahun=2025&periode_id=1
 *   GET /api/lakip-generator/export/docx?tahun=2025&periode_id=1
 */

const puppeteer    = require("puppeteer");
const HTMLtoDOCX   = require("html-to-docx");
const juice        = require("juice");
const genCtrl      = require("./lakipGeneratorController");

// ── Shared: generate HTML string (reuse dari generator) ──────────────────────
async function getHtml(req) {
  return new Promise((resolve, reject) => {
    // Buat fake res untuk menangkap HTML output dari generator
    let body = "";
    const fakeRes = {
      setHeader: () => {},
      setHeader: () => {},
      send: (html) => resolve(html),
      status: (code) => ({ send: (msg) => reject(new Error(`${code}: ${msg}`)) }),
    };
    genCtrl.preview(req, fakeRes).catch(reject);
  });
}

// ── Print-specific CSS override ───────────────────────────────────────────────
// Fase 18 Poin 6.1: dulu `.page` di sini punya padding 20/15/20/25mm SENDIRI
// SEKALIGUS Puppeteer punya margin sendiri (lihat `margin` const di exportPdf)
// — dua-duanya diterapkan bertumpuk, menyisakan lebar cetak efektif cuma
// ~150mm dari 210mm (lihat FASE17-PERBAIKAN-TAMPILAN-DOKUMEN.md Poin 6).
// Sekarang `.page` padding di-nolkan di sini — margin cetak SEPENUHNYA jadi
// tanggung jawab Puppeteer punya sendiri (satu sumber, bukan dua). Ini HANYA
// berlaku saat export (PRINT_CSS diinject setelah <style> bawaan buildHtml());
// mode /preview di browser (tanpa PRINT_CSS) tetap pakai padding aslinya
// sendiri supaya masih terlihat seperti "kertas" di layar.
const PRINT_CSS = `
<style>
  .toolbar { display: none !important; }
  .content-wrapper { margin-top: 0 !important; }
  body { font-size: 11pt; }
  .page {
    width: 210mm;
    padding: 0 !important;
    margin: 0 !important;
    page-break-after: always;
  }
  .page:last-child { page-break-after: avoid; }
  /* Fase 21 Poin A/B (FASE21-MARGIN-FIX.md) — AKAR MASALAH margin Fase 20
     "hilang": properti margin:0 di dalam @page (CSS) ini BENTROK dengan
     opsi margin Puppeteer (page.pdf margin option) — dibuktikan lewat
     pengukuran piksel langsung (render halaman jadi bitmap, hitung jarak
     konten ke tepi): dengan margin:0 di @page aktif, margin efektif jadi
     cuma ~0.2-0.7cm padahal Puppeteer diset 3cm/2cm/3cm/2cm; begitu properti
     margin di @page dihapus (size tetap dipertahankan), margin balik sesuai
     Puppeteer. @page di sini sekarang HANYA atur ukuran kertas — margin
     sepenuhnya jadi tanggung jawab Puppeteer (satu sumber, konsisten dgn
     Fase 18/20). */
  @page {
    size: A4 portrait;
  }
</style>
`;

function injectPrintCss(html) {
  return html.replace("</head>", PRINT_CSS + "</head>");
}

// Fase 17 Poin 4 — pisahkan Cover dari sisanya supaya bisa dirender 2 pass
// terpisah (cover TANPA header/footer/nomor halaman, sisanya SEPERTI BIASA
// dengan header/footer), lalu digabung dengan pdf-lib. Marker komentar
// `<!-- COVER -->`/`<!-- KATA PENGANTAR -->` sudah ada di buildHtml() untuk
// keperluan lain (readability template) — dipakai ulang di sini sebagai titik
// potong, SAMA seperti pola splitHtmlForPrint() di renstraGenerateController.js
// (dokumen Renstra sudah lebih dulu menyelesaikan masalah yang sama, cover
// full-bleed tanpa band header/footer).
//
// KETERBATASAN yang sengaja diterima (bukan bug): karena cover dirender di
// PDF terpisah dari sisanya, Puppeteer/Chromium menomori tiap render mulai
// dari 1 lagi — setelah digabung, pageNumber pada halaman pertama SETELAH
// cover akan menunjukkan "1 / N" (N = total halaman TANPA cover), bukan
// "2 / (N+1)" seperti kalau seluruh dokumen dirender 1 pass. Ini pola yang
// sama dipakai dokumen Renstra (cover tak bernomor, isi mulai dari 1) — lazim
// untuk dokumen resmi bercover terpisah, bukan regresi.
function splitCoverFromRest(html) {
  const markerCover = "<!-- ═══════════════ COVER ═══════════════ -->";
  const markerKataPengantar = "<!-- ═══════════════ KATA PENGANTAR ═══════════════ -->";
  const idxCover = html.indexOf(markerCover);
  const idxKP = html.indexOf(markerKataPengantar);
  if (idxCover === -1 || idxKP === -1) {
    // Marker tidak ketemu (mis. template berubah) — fallback aman: render 1 pass seperti sebelumnya.
    return { cover: null, rest: html };
  }
  const bodyOpenIdx = html.indexOf("<body>") + "<body>".length;
  const head = html.slice(0, bodyOpenIdx);
  // `.page` normalnya dapat padding 20mm/15mm (PRINT_CSS) supaya teks isi
  // dokumen tidak mepet tepi kertas — tapi utk cover, `.cover` di dalamnya
  // SUDAH punya box sendiri (min-height:297mm, box-sizing:border-box, lihat
  // lakipGeneratorController.js). PRINT_CSS sekarang sudah menolkan `.page`
  // padding secara global (Fase 18 Poin 6.1), jadi tidak perlu override
  // khusus lagi di sini seperti Fase 17 — cukup pastikan render cover pakai
  // margin Puppeteer 0 (lihat `noMargin` di exportPdf) supaya `.cover` yang
  // sudah pas 1 halaman A4 penuh tidak overflow.
  const cover = `${head}${html.slice(idxCover, idxKP)}</body></html>`;
  const rest = `${head}${html.slice(idxKP)}`;
  return { cover, rest };
}

// ── PDF Export — helper bersama (dipakai exportPdf & exportPdfFinal) ─────────

// Fase 18 Poin 6.1 — margin cetak SATU-SATUNYA sumber (dulu bertumpuk dengan
// padding CSS `.page`, lihat komentar PRINT_CSS di atas).
// Fase 20 Poin A — atas/kanan/bawah/kiri disesuaikan permintaan resmi: kiri
// dilebihkan (ruang jilid/binding, konvensi dokumen resmi pemerintah — sisi
// yang dijilid selalu kiri untuk dokumen potrait), kanan lebih sempit.
// Lebar cetak efektif: 210 - (30+20) = 160mm. Tinggi efektif: 297 - (30+20) = 247mm.
const MARGIN = { top: "3cm", bottom: "2cm", left: "3cm", right: "2cm" };
// Cover TANPA margin luar — `.cover` sudah dirancang mengisi persis 1 halaman
// A4 penuh (min-height:297mm + box-sizing:border-box) sendiri, margin
// Puppeteer di atas itu akan membuatnya overflow (lihat komentar
// splitCoverFromRest di atas & FASE17-PERBAIKAN-TAMPILAN-DOKUMEN.md Poin 6).
const NO_MARGIN = { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" };

// Fase 21 (FASE21-MARGIN-FIX.md) — AKAR MASALAH margin Fase 20 "hilang" (jadi
// cuma ~0.5cm padahal diset 3cm/2cm/3cm/2cm): dibuktikan lewat pengukuran
// piksel langsung (render halaman jadi bitmap, hitung jarak konten ke tepi)
// bahwa Puppeteer displayHeaderFooter:true DIKOMBINASIKAN dengan
// headerTemplate/footerTemplate BERISI KONTEN (bukan `<span></span>` kosong)
// membuat Puppeteer/Chromium (versi terpasang: puppeteer 24.14.0 / Chrome
// 138) MENGABAIKAN TOTAL opsi `margin` — dicoba margin 3cm, 5cm, satuan inch,
// bahkan CSS @page, HASILNYA SAMA PERSIS (~0.5cm) selama header/footer punya
// konten nyata. Begitu header/footer dikosongkan (`<span></span>`) ATAU
// displayHeaderFooter:false, margin kembali benar. ISI HTML/CSS LAKIP TIDAK
// RELEVAN — direproduksi juga dengan HTML generik `<div>Header</div>`.
//
// FIX: Puppeteer TIDAK PERNAH lagi diberi headerTemplate/footerTemplate
// berisi konten (selalu displayHeaderFooter:false) — margin jadi 100% andal.
// Header/footer/nomor halaman sekarang di-"cap" SETELAH render, langsung ke
// PDF hasil merge, pakai pdf-lib (pola sama dengan stampPageNumbers Fase 19,
// sekarang digeneralisasi mencakup teks header+footer juga). Dipakai BERSAMA
// oleh exportPdf DAN exportPdfFinal — keduanya sama-sama kena bug ini.
const MARGIN_PT = { top: 85.04, bottom: 56.69, left: 85.04, right: 56.69 }; // 3cm/2cm/3cm/2cm dalam point (1cm=28.3465pt)

function buildHeaderFooterText(tahun, namaOpd, namaProvinsi) {
  const headerText = `LAKIP/LKj Tahun ${tahun} — ${namaOpd} ${namaProvinsi}`;
  const footerText = `Dokumen ini digenerate secara otomatis oleh sistem ePeLARA ${namaOpd} pada ${new Date().toLocaleDateString("id-ID")}`;
  return { headerText, footerText };
}

// Cap header (kiri: judul, kanan: nomor halaman) + footer (rata-tengah) ke
// SEMUA halaman KECUALI halaman pertama (cover — konvensi sejak Fase 17:
// cover tidak bernomor/tanpa header-footer). `totalPages` = jumlah halaman
// TIDAK termasuk cover (konsisten dgn nomor yang disuntik ke Daftar Isi di
// exportPdfFinal, dan dengan page count "rest" sendiri di exportPdf biasa).
async function stampHeaderFooter(pdfBuffer, { headerText, footerText, totalPages }) {
  const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
  const doc = await PDFDocument.load(pdfBuffer);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const gray = rgb(0.53, 0.53, 0.53);
  const lightGray = rgb(0.67, 0.67, 0.67);

  for (let i = 1; i < pages.length; i += 1) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const pageNum = i;

    // Header — dalam pita margin atas, rata dengan kiri/kanan margin isi.
    const headerY = height - 50;
    page.drawText(headerText, { x: MARGIN_PT.left, y: headerY, size: 8, font, color: gray });
    const pageLabel = `${pageNum} / ${totalPages}`;
    const pageLabelWidth = font.widthOfTextAtSize(pageLabel, 8);
    page.drawText(pageLabel, {
      x: width - MARGIN_PT.right - pageLabelWidth,
      y: headerY,
      size: 8,
      font,
      color: gray,
    });

    // Footer — rata-tengah, dalam pita margin bawah.
    const footerWidth = font.widthOfTextAtSize(footerText, 7);
    page.drawText(footerText, {
      x: Math.max(MARGIN_PT.left, (width - footerWidth) / 2),
      y: 25,
      size: 7,
      font,
      color: lightGray,
    });
  }
  return Buffer.from(await doc.save());
}

async function launchBrowser() {
  return puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });
}

// Fase 21 — parameter headerFooter DIHAPUS (dulu dipakai isi Puppeteer
// headerTemplate/footerTemplate). displayHeaderFooter SELALU false sekarang
// — lihat komentar panjang di stampHeaderFooter kenapa itu wajib supaya
// margin tidak diabaikan Puppeteer.
async function renderPdfPage(browser, htmlContent, marginOverride) {
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0", timeout: 30000 });
  const buffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: marginOverride || MARGIN,
    displayHeaderFooter: false,
  });
  await page.close();
  return buffer;
}

async function mergePdfBuffers(buffers) {
  const { PDFDocument } = require("pdf-lib");
  const mergedPdf = await PDFDocument.create();
  for (const buf of buffers.filter(Boolean)) {
    const doc = await PDFDocument.load(buf);
    const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((p) => mergedPdf.addPage(p));
  }
  return Buffer.from(await mergedPdf.save());
}

async function pdfPageCount(buf) {
  const { PDFDocument } = require("pdf-lib");
  const doc = await PDFDocument.load(buf);
  return doc.getPageCount();
}

// ── PDF Export (cepat, tanpa nomor halaman Daftar Isi) ───────────────────────
// Dipakai sehari-hari untuk cek data — 2 render pass (cover + rest), TIDAK
// berubah dari Fase 17/18. Fase 19: TETAP endpoint/perilaku ini, tidak
// disentuh — mode lambat (dengan nomor halaman) ada di exportPdfFinal terpisah.

exports.exportPdf = async (req, res) => {
  const { tahun = String(new Date().getFullYear()), periode_id = "1" } = req.query;
  let browser;

  try {
    // Ambil HTML dari generator + identitas OPD aktif (Fase 17 — dulu hardcode
    // "Dinas Ketahanan Pangan", lihat FASE17-PERBAIKAN-TAMPILAN-DOKUMEN.md).
    const [rawHtml, opdIdentitas] = await Promise.all([
      getHtml(req),
      genCtrl.getOpdIdentitas(),
    ]);
    const { nama_opd: namaOpd, nama_provinsi: namaProvinsi } = opdIdentitas;
    const html = injectPrintCss(rawHtml);
    const { headerText, footerText } = buildHeaderFooterText(tahun, namaOpd, namaProvinsi);

    browser = await launchBrowser();
    const { cover, rest } = splitCoverFromRest(html);

    let pdfBuffer;
    if (!cover) {
      // Fallback: marker tak ketemu (harusnya tak pernah terjadi — template
      // berubah tak terduga). stampHeaderFooter selalu skip halaman pertama
      // (asumsi ada cover) — di jalur fallback ini halaman pertama jadi ikut
      // tanpa header/footer, penyimpangan minor yang bisa diterima utk kasus
      // yang seharusnya tak pernah terjadi ini.
      const restBuf = await renderPdfPage(browser, rest);
      const totalPages = (await pdfPageCount(restBuf)) - 1;
      pdfBuffer = await stampHeaderFooter(restBuf, { headerText, footerText, totalPages });
    } else {
      const [coverBuf, restBuf] = await Promise.all([
        renderPdfPage(browser, cover, NO_MARGIN),
        renderPdfPage(browser, rest),
      ]);
      const totalPages = await pdfPageCount(restBuf);
      const merged = await mergePdfBuffers([coverBuf, restBuf]);
      pdfBuffer = await stampHeaderFooter(merged, { headerText, footerText, totalPages });
    }

    const namaOpdSlug = namaOpd.replace(/\s+/g, "");
    const filename = `LAKIP_${tahun}_${namaOpdSlug}.pdf`;
    res.setHeader("Content-Type",        "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length",      pdfBuffer.length);
    res.setHeader("Cache-Control",       "no-store");
    return res.end(pdfBuffer);

  } catch (err) {
    console.error("[lakipExport] PDF error:", err.message);
    return res.status(500).json({ success: false, message: "Gagal generate PDF: " + err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

// ── PDF Export FINAL (dengan Nomor Halaman Daftar Isi) — Fase 19 ────────────
// FASE19-NOMOR-HALAMAN-TOC.md — Opsi A (level Bab), dipakai HANYA saat dokumen
// benar-benar mau diterbitkan resmi (jauh lebih lambat dari exportPdf biasa:
// ~12 render Puppeteer vs 2). Marker split di bawah HARUS sinkron dengan
// TOC_SECTIONS di lakipGeneratorController.js — safeguard validateTocSync()
// menolak generate (throw error) kalau ada drift, BUKAN diam-diam salah nomor.
const BAB_SECTION_MARKERS = [
  { key: "kata_pengantar", marker: "<!-- ═══════════════ KATA PENGANTAR ═══════════════ -->" },
  { key: "daftar_isi", marker: "<!-- ═══════════════ DAFTAR ISI ═══════════════ -->" },
  { key: "ringkasan_eksekutif", marker: "<!-- ═══════════════ RINGKASAN EKSEKUTIF ═══════════════ -->" },
  { key: "bab1", marker: "<!-- ═══════════════ BAB I — PENDAHULUAN ═══════════════ -->" },
  { key: "bab2", marker: "<!-- ═══════════════ BAB II — PERENCANAAN KINERJA ═══════════════ -->" },
  { key: "bab3", marker: "<!-- ═══════════════ SASARAN STRATEGIS ═══════════════ -->" }, // = awal BAB III (nama marker legacy, isinya "BAB III — AKUNTABILITAS KINERJA")
  { key: "bab4", marker: "<!-- ═══════════════ PENUTUP + TTD ═══════════════ -->" }, // = awal BAB IV
  { key: "pernyataan_reviu", marker: "<!-- ═══════════════ PERNYATAAN TELAH DIREVIU ═══════════════ -->" },
  { key: "lampiran1", marker: "<!-- ═══════════════ LAMPIRAN 1 — PERJANJIAN KINERJA ═══════════════ -->" },
  { key: "lampiran2", marker: "<!-- ═══════════════ LAMPIRAN 2 — PENGUKURAN KINERJA ═══════════════ -->" },
];

// Generalisasi splitCoverFromRest() (Fase 17) — potong HTML jadi N section
// berurutan berdasar array marker. `html` di sini adalah `rest` (SUDAH tanpa
// Cover, hasil splitCoverFromRest). Setiap section jadi dokumen HTML utuh
// sendiri (bisa dirender Puppeteer terpisah) — sama persis pola cover/rest.
function splitHtmlIntoSections(html, markerEntries) {
  const bodyOpenIdx = html.indexOf("<body>") + "<body>".length;
  const head = html.slice(0, bodyOpenIdx);
  const positions = markerEntries.map((m) => html.indexOf(m.marker));
  return markerEntries.map((m, i) => {
    const start = positions[i];
    if (start === -1) return null; // marker tidak ketemu — ditangkap validateTocSync
    const end = i + 1 < markerEntries.length ? positions[i + 1] : html.length;
    const slice = html.slice(start, end);
    const isLast = end === html.length;
    return `${head}${slice}${isLast ? "" : "</body></html>"}`;
  });
}

// Safeguard WAJIB (Fase 19 Part B) — sebelum render mahal dijalankan, pastikan
// (1) SEMUA marker ketemu, (2) jumlah marker PERSIS sama dengan jumlah baris
// level-Bab di tabel Daftar Isi yang SEDANG di-generate (bukan asumsi statis)
// — supaya kalau suatu saat ada yang menambah/menghapus Bab di buildHtml()
// tanpa mengupdate BAB_SECTION_MARKERS di sini (atau sebaliknya), proses
// GAGAL EKSPLISIT dengan pesan jelas, bukan diam-diam menghasilkan nomor
// halaman yang keliru di dokumen resmi yang sudah terlanjur diterbitkan.
function validateTocSync(html, markerEntries) {
  const missing = markerEntries.filter((m) => html.indexOf(m.marker) === -1).map((m) => m.key);
  if (missing.length) {
    throw new Error(
      `[Fase19 safeguard] Marker tidak ditemukan di template buildHtml(): ${missing.join(", ")}. ` +
        `Kemungkinan template berubah tapi BAB_SECTION_MARKERS di lakipExportController.js belum diupdate.`,
    );
  }

  const idxDaftarIsi = html.indexOf(
    markerEntries.find((m) => m.key === "daftar_isi").marker,
  );
  const idxRingkasan = html.indexOf(
    markerEntries.find((m) => m.key === "ringkasan_eksekutif").marker,
  );
  const tocHtml = html.slice(idxDaftarIsi, idxRingkasan);
  const totalTr = (tocHtml.match(/<tr>/g) || []).length;
  const subItemTr = (tocHtml.match(/<tr><td style="padding-left:24px"/g) || []).length;
  const babLevelRows = totalTr - subItemTr;

  if (babLevelRows !== markerEntries.length) {
    throw new Error(
      `[Fase19 safeguard] Mismatch: ${markerEntries.length} marker section ditemukan, ` +
        `${babLevelRows} baris level-Bab di tabel Daftar Isi — buildHtml() (TOC_SECTIONS) dan ` +
        `BAB_SECTION_MARKERS di lakipExportController.js tidak sinkron. Cek apakah ada Bab yang ` +
        `ditambah/dihapus di salah satu tempat tapi tidak di tempat lain. TIDAK melanjutkan render ` +
        `supaya tidak menerbitkan dokumen dengan nomor halaman yang berpotensi salah.`,
    );
  }
}

exports.exportPdfFinal = async (req, res) => {
  const { tahun = String(new Date().getFullYear()), periode_id = "1" } = req.query;
  let browser;
  const t0 = Date.now();

  try {
    const [data, opdIdentitas] = await Promise.all([
      genCtrl.collectLakipData(tahun, parseInt(periode_id, 10) || 1),
      genCtrl.getOpdIdentitas(),
    ]);
    const { nama_opd: namaOpd, nama_provinsi: namaProvinsi } = opdIdentitas;
    // Fase 21 — headerText/footerText di sini TIDAK diberikan ke Puppeteer
    // sama sekali (lihat stampHeaderFooter), cuma disimpan utk dicap belakangan.
    const { headerText, footerText } = buildHeaderFooterText(tahun, namaOpd, namaProvinsi);

    // Render pertama TANPA pageNumbers — dipakai HANYA untuk menghitung jumlah
    // halaman per-section (kontennya identik dengan exportPdf biasa).
    const htmlNoNumbers = injectPrintCss(genCtrl.buildHtml(data));

    // Safeguard WAJIB — sebelum split+render (~12x Puppeteer), validasi dulu.
    validateTocSync(htmlNoNumbers, BAB_SECTION_MARKERS);

    const { cover, rest } = splitCoverFromRest(htmlNoNumbers);
    const sectionHtmls = splitHtmlIntoSections(rest, BAB_SECTION_MARKERS);

    browser = await launchBrowser();

    // Render cover + semua section PARALEL (tiap section independen — cuma
    // urutan/nomor kumulatifnya yang perlu dihitung berurutan SETELAH semua
    // page count diketahui, bukan render-nya).
    const [coverBuf, ...sectionBuffers] = await Promise.all([
      cover ? renderPdfPage(browser, cover, NO_MARGIN) : Promise.resolve(null),
      ...sectionHtmls.map((h) => renderPdfPage(browser, h)),
    ]);

    const pageCounts = await Promise.all(sectionBuffers.map((buf) => pdfPageCount(buf)));
    const pageNumbers = {};
    let cumulative = 0; // cover tidak dihitung/dinomori (konvensi Fase 17 — isi mulai dari 1)
    BAB_SECTION_MARKERS.forEach((m, i) => {
      pageNumbers[m.key] = cumulative + 1;
      cumulative += pageCounts[i];
    });

    // Render KEDUA — khusus Daftar Isi, dengan nomor yang sudah dihitung.
    const htmlWithNumbers = injectPrintCss(genCtrl.buildHtml(data, { pageNumbers }));
    const { rest: restWithNumbers } = splitCoverFromRest(htmlWithNumbers);
    const sectionHtmlsWithNumbers = splitHtmlIntoSections(restWithNumbers, BAB_SECTION_MARKERS);
    const daftarIsiIdx = BAB_SECTION_MARKERS.findIndex((m) => m.key === "daftar_isi");
    const daftarIsiBufFinal = await renderPdfPage(browser, sectionHtmlsWithNumbers[daftarIsiIdx]);

    // Sanity check ringan (bukan safeguard fatal): kalau jumlah halaman
    // Daftar Isi berubah setelah angka disuntik (jarang, tapi mungkin kalau
    // tabel pas mepet batas halaman), nomor section SESUDAHNYA berpotensi
    // geser — dicatat sebagai warning di log, tidak menggagalkan proses
    // (lihat keterbatasan yang didokumentasikan di FASE17 Poin 8 Opsi A).
    const daftarIsiPageCountFinal = await pdfPageCount(daftarIsiBufFinal);
    if (daftarIsiPageCountFinal !== pageCounts[daftarIsiIdx]) {
      console.warn(
        `[lakipExport] PDF FINAL: jumlah halaman Daftar Isi berubah setelah nomor disuntik ` +
          `(${pageCounts[daftarIsiIdx]} -> ${daftarIsiPageCountFinal}) — nomor halaman section ` +
          `sesudah Daftar Isi berpotensi bergeser 1. Lihat FASE19-NOMOR-HALAMAN-TOC.md.`,
      );
    }

    const finalBuffers = sectionBuffers.map((buf, i) => (i === daftarIsiIdx ? daftarIsiBufFinal : buf));
    const mergedBuffer = await mergePdfBuffers([coverBuf, ...finalBuffers]);
    // Cap header/footer/nomor halaman KUMULATIF (sama dengan yang disuntik ke
    // Daftar Isi, `cumulative` di sini = total halaman non-cover) — lihat
    // komentar panjang di stampHeaderFooter kenapa ini WAJIB (bukan cuma utk
    // nomor halaman Fase 19 — sekarang juga satu-satunya cara header/footer
    // tercetak sama sekali, karena Puppeteer-nya sengaja tidak diberi teks).
    const pdfBuffer = await stampHeaderFooter(mergedBuffer, { headerText, footerText, totalPages: cumulative });

    const elapsedMs = Date.now() - t0;
    console.log(`[lakipExport] PDF FINAL (dengan nomor halaman) selesai dalam ${elapsedMs}ms, ${finalBuffers.length + 1} section (termasuk cover).`);

    const namaOpdSlug = namaOpd.replace(/\s+/g, "");
    const filename = `LAKIP_${tahun}_${namaOpdSlug}_FINAL.pdf`;
    res.setHeader("Content-Type",        "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length",      pdfBuffer.length);
    res.setHeader("Cache-Control",       "no-store");
    res.setHeader("X-Render-Time-Ms",    String(elapsedMs));
    return res.end(pdfBuffer);

  } catch (err) {
    console.error("[lakipExport] PDF FINAL error:", err.message);
    return res.status(500).json({ success: false, message: "Gagal generate PDF final: " + err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

// ── DEPRECATED: template DOCX lama, terpisah dari template PDF (lihat AUDIT-LAKIP-SISTEMATIKA.md).
// Tidak dipanggil lagi sejak Fase 1 — exportDocx sekarang reuse getHtml() (sama dgn PDF).
// Dibiarkan di sini (bukan dihapus) supaya masih bisa dibandingkan/rollback bila reuse HTML bermasalah.
function buildDocxHtml_deprecated(data) {
  const { meta, visi, misi, sasaran, indikator, iku = [], ikk = [], lakipEntries, anggaran } = data;
  const tahun = meta.tahun;
  const opd   = meta.opd;

  const escH = (s) => !s ? "" : String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const fmtRp = (n) => "Rp " + (parseFloat(n)||0).toLocaleString("id-ID");

  const buildIndRows = (items) =>
    items.length
      ? items.map((ind, i) => `
        <tr>
          <td>${i+1}</td>
          <td>${escH(ind.nama_indikator)}</td>
          <td>${escH(ind.satuan||"-")}</td>
          <td>${ind.target||"-"}</td>
          <td>${ind.realisasi||"-"}</td>
          <td>${ind.pct_capaian}%</td>
          <td>${ind.status_capaian}</td>
        </tr>
        <tr><td colspan="7"><em>Analisis: ${escH(ind.narasi)}</em></td></tr>`).join("")
      : `<tr><td colspan="7">Belum ada data indikator untuk tahun ${tahun}</td></tr>`;

  const indRows = buildIndRows(indikator);
  const ikuRows = buildIndRows(iku);
  const ikkRows = buildIndRows(ikk);
  const indikatorTableHead = `
    <thead>
      <tr>
        <th>No</th><th>Indikator</th><th>Satuan</th>
        <th>Target</th><th>Realisasi</th><th>Capaian</th><th>Status</th>
      </tr>
    </thead>`;

  const lakipRows = lakipEntries.length
    ? lakipEntries.map((l, i) => `
        <tr>
          <td>${i+1}</td>
          <td>${escH(l.program||"-")}</td>
          <td>${escH(l.kegiatan||"-")}</td>
          <td>${escH(l.indikator_kinerja||"-")}</td>
          <td>${escH(l.target||"-")}</td>
          <td>${escH(l.realisasi||"-")}</td>
          <td>${escH(l.evaluasi||"-")}</td>
        </tr>`).join("")
    : `<tr><td colspan="7">Belum ada data program/kegiatan</td></tr>`;

  const misiItems = misi.map((m) => `<li>Misi ${m.no_misi}: ${escH(m.isi_misi)}</li>`).join("");
  const sasaranItems = sasaran.map((s) => `<li>Sasaran ${escH(s.nomor)}: ${escH(s.isi_sasaran)}</li>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>LAKIP ${tahun}</title></head>
<body>
  <h1 style="text-align:center">LAPORAN AKUNTABILITAS KINERJA INSTANSI PEMERINTAH</h1>
  <h2 style="text-align:center">${escH(opd.nama_opd)} — Provinsi ${escH(opd.nama_provinsi)}</h2>
  <h2 style="text-align:center">TAHUN ${escH(tahun)}</h2>

  <hr/>

  <h2>RINGKASAN EKSEKUTIF</h2>
  <p>${escH(opd.nama_opd)} Provinsi ${escH(opd.nama_provinsi)} menyusun Laporan Akuntabilitas Kinerja
  Instansi Pemerintah (LAKIP) Tahun ${escH(tahun)} sebagai bentuk pertanggungjawaban atas pelaksanaan
  program dan kegiatan dalam rangka pencapaian tujuan dan sasaran yang telah ditetapkan dalam
  Rencana Strategis.</p>
  ${anggaran.total_pagu > 0 ? `<p>Alokasi anggaran: <strong>${fmtRp(anggaran.total_pagu)}</strong>.
  Realisasi: <strong>${fmtRp(anggaran.total_realisasi)}</strong> (${anggaran.pct}%).</p>` : ""}
  <p><strong>Jumlah Indikator Kinerja:</strong> ${indikator.length}<br/>
  <strong>Tercapai:</strong> ${indikator.filter(i=>i.pct_capaian>=100).length}<br/>
  <strong>Belum Tercapai:</strong> ${indikator.filter(i=>i.pct_capaian<100).length}</p>

  <h3>Visi</h3>
  <p><em>"${escH(visi)}"</em></p>

  <h3>Misi</h3>
  <ul>${misiItems || "<li>Belum ada data</li>"}</ul>

  <h2>BAB I — SASARAN STRATEGIS &amp; INDIKATOR KINERJA</h2>
  <h3>Sasaran Strategis</h3>
  <ul>${sasaranItems || "<li>Belum ada data sasaran</li>"}</ul>

  ${iku.length ? `
  <h3>Indikator Kinerja Utama (IKU)</h3>
  <table border="1" cellpadding="4" cellspacing="0" width="100%">
    ${indikatorTableHead}
    <tbody>${ikuRows}</tbody>
  </table>` : ""}

  ${ikk.length ? `
  <h3>Indikator Kinerja Kunci (IKK)</h3>
  <table border="1" cellpadding="4" cellspacing="0" width="100%">
    ${indikatorTableHead}
    <tbody>${ikkRows}</tbody>
  </table>` : ""}

  <h3>Capaian Indikator Kinerja Tahun ${escH(tahun)}</h3>
  <table border="1" cellpadding="4" cellspacing="0" width="100%">
    ${indikatorTableHead}
    <tbody>${indRows}</tbody>
  </table>

  <h2>BAB II — AKUNTABILITAS PROGRAM &amp; KEGIATAN</h2>
  <table border="1" cellpadding="4" cellspacing="0" width="100%">
    <thead>
      <tr>
        <th>No</th><th>Program</th><th>Kegiatan</th><th>Indikator</th>
        <th>Target</th><th>Realisasi</th><th>Evaluasi</th>
      </tr>
    </thead>
    <tbody>${lakipRows}</tbody>
  </table>

  <h2>BAB III — PENUTUP</h2>
  <p>${escH(opd.nama_opd)} telah melaksanakan program dan kegiatan sesuai tugas pokok dan fungsinya
  dalam mendukung ketahanan pangan Provinsi ${escH(opd.nama_provinsi)} pada Tahun ${escH(tahun)}.</p>
  <h3>Rekomendasi</h3>
  <ul>
    <li>Peningkatan koordinasi lintas bidang dalam pelaksanaan program ketahanan pangan.</li>
    <li>Optimalisasi anggaran yang tersedia untuk mencapai target indikator kinerja.</li>
    <li>Penguatan monitoring dan evaluasi berkala terhadap capaian indikator kinerja.</li>
  </ul>

  <p><br/><br/>
  ${escH(opd.nama_provinsi)}, ${new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}<br/>
  ${escH(opd.kepala_opd)}<br/><br/><br/><br/>
  (__________________________)<br/>
  ${escH(opd.nip_kepala)}
  </p>
</body>
</html>`;
}

// ── DOCX Export ───────────────────────────────────────────────────────────────

// html-to-docx (lib ini) HANYA membaca atribut inline `style="..."` per elemen —
// ia tidak parse blok <style> sama sekali (tidak ada dukungan CSS class/id selector,
// termasuk `display:none`). Puppeteer (jalur PDF) full-CSS jadi PRINT_CSS bisa
// menyembunyikan toolbar lewat `.toolbar{display:none}`; untuk DOCX itu tidak berlaku,
// jadi toolbar (tombol Cetak/Tutup) harus dibuang fisik dari HTML sebelum dikonversi.
// [Fase 1b bugfix, ditemukan saat verifikasi Fase 2] `juice()` (dipanggil SEBELUM fungsi
// ini di exportDocx) menyisipkan `style="..."` SETELAH `class="toolbar no-print"` pada
// tag <div> itu sendiri (mis. `<div class="toolbar no-print" style="...">`), jadi regex
// lama yang mengharuskan `>` persis setelah class tidak match lagi begitu juice
// diaktifkan — toolbar bocor ke DOCX tanpa terdeteksi (baru ketahuan saat verifikasi
// Fase 2 karena kontennya sekarang terhitung sebagai heading BAB, bukan cuma cek string).
// Fix: terima atribut apa pun di antara class dan `>`.
function stripDocxToolbar(html) {
  return html.replace(/<div class="toolbar no-print"[^>]*>[\s\S]*?<\/div>\s*/, "");
}

// [Fase 1b] html-to-docx tidak mengenali <style> sebagai elemen yang harus dilewati.
// Sebelumnya (Fase 1) blok <style> dibuang mentah-mentah sebelum konversi — aman dari
// CSS-dump-jadi-teks, tapi semua styling class-based (font-size judul/tabel/narasi,
// bold+warna header <th>) ikut hilang karena tidak sempat "dipindahkan" ke elemen.
// Fase 1b menyisipkan juice() SEBELUM fungsi ini (lihat exportDocx) untuk inline-kan
// CSS class ke atribut `style=` per elemen — dengan begitu <style> block yang tersisa
// di titik ini hanya berisi at-rules yang memang TIDAK BISA di-inline (mis. @media
// print, @page) karena sifatnya kondisional. Tetap dibuang di sini karena at-rules itu
// juga akan didorong jadi teks paragraf kalau dibiarkan (root cause sama seperti Fase 1).
function stripDocxStyleBlock(html) {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
}

// html-to-docx v1.7.0 CRASHES ("The string contains invalid characters. Invalid XML
// name: @w") when a table cell (<th>/<td>) has an inline `width:NN%` (juga
// `width:auto`) SEBAGAI BAGIAN dari style-nya — dibuktikan lewat bisection manual
// (lihat FASE1-SATUKAN-TEMPLATE.md). Sejak juice() dipakai (Fase 1b), style width ini
// datang tergabung dengan properti lain yang justru ingin dipertahankan (background,
// color, font-weight header <th>) — jadi fix-nya buang HANYA komponen `width:...;` dari
// dalam string style, bukan seluruh atribut style seperti sebelumnya (Fase 1 lama
// membuang seluruh `style="width:NN%"` karena saat itu memang cuma berisi width).
// Konsekuensi tetap sama: proporsi lebar kolom hilang di DOCX (Masalah B, known
// limitation html-to-docx — lihat verifikasi Fase 1, tidak coba diperbaiki di sini).
function stripDocxTableCellWidthStyle(html) {
  return html.replace(/<(t[hd])\b([^>]*)>/gi, (match, tag, attrs) => {
    if (!/style\s*=/i.test(attrs)) return match;
    const newAttrs = attrs.replace(/style\s*=\s*"([^"]*)"/i, (m, styleVal) => {
      const cleaned = styleVal
        .split(";")
        .map((decl) => decl.trim())
        .filter((decl) => decl && !/^width\s*:/i.test(decl))
        .join("; ");
      return cleaned ? `style="${cleaned};"` : "";
    });
    return `<${tag}${newAttrs}>`;
  });
}

exports.exportDocx = async (req, res) => {
  const { tahun = String(new Date().getFullYear()) } = req.query;

  try {
    // Reuse HTML yang sama dengan exportPdf (buildHtml() di lakipGeneratorController),
    // supaya sistematika Bab PDF & DOCX otomatis konsisten (lihat AUDIT-LAKIP-SISTEMATIKA.md).
    const [rawHtml, opdIdentitas] = await Promise.all([
      getHtml(req),
      genCtrl.getOpdIdentitas(),
    ]);
    const { nama_opd: namaOpd } = opdIdentitas;
    // [Fase 1b] Inline-kan seluruh CSS class ke style= per elemen SEBELUM strip apa pun,
    // supaya font-size judul/tabel/narasi dan bold+warna header <th> ikut terbawa ke DOCX.
    const inlinedHtml  = juice(rawHtml);
    const docxHtml     = stripDocxTableCellWidthStyle(
      stripDocxToolbar(stripDocxStyleBlock(inlinedHtml)),
    );

    const docxBuffer = await HTMLtoDOCX(docxHtml, null, {
      title:      `LAKIP ${tahun} — ${namaOpd}`,
      subject:    "Laporan Akuntabilitas Kinerja Instansi Pemerintah",
      creator:    "ePeLARA",
      footer:     true,
      pageNumber: true,
      skipFirstHeaderFooter: true, // Fase 17 Poin 4 — cover tanpa nomor halaman, sama pola dgn renstraGenerateController.js
      font:       "Times New Roman",
      fontSize:   24,
      // Fase 20 Poin A/C — margin cetak konsisten dengan PDF (3cm/2cm/3cm/2cm,
      // kiri dilebihkan utk ruang jilid), DAN wajib sertakan LENGKAP 7 field
      // (bukan cuma top/right/bottom/left seperti sebelumnya).
      //
      // AKAR MASALAH file .docx tidak bisa dibuka di Word (FASE20-MARGIN-TTD-
      // BUGFIX-WORD.md Poin C): html-to-docx@1.7.0 (dan 1.8.0, dicek juga —
      // tidak diperbaiki di versi itu) men-generate <w:pgMar> dengan MENGUTIP
      // LANGSUNG margins.header/margins.footer/margins.gutter TANPA fallback
      // ke default kalau properti itu tidak diisi caller. Kode lama di sini
      // cuma kasih top/right/bottom/left (4 dari 7 field) — 3 sisanya jadi
      // `undefined`, tercetak literal jadi `w:header="undefined"` dkk di
      // word/document.xml. Itu masih lolos sebagai XML well-formed (makanya
      // ZIP/XML parser generik seperti yauzl/xmldoc tidak mendeteksi apa-apa),
      // tapi melanggar skema OOXML yang mengharuskan nilai TWIP numerik — Word
      // menolak buka file SAMA SEKALI ("Word experienced an error trying to
      // open the file"), persis gejala yang dilaporkan user. Dikonfirmasi BUKAN
      // regresi Fase 17-19 — file dari commit sebelum Fase 13 pun gagal identik
      // saat diuji ulang. Fix: SELALU sertakan header/footer/gutter eksplisit
      // (nilai default resmi library ini per README: header/footer=720 TWIP
      // [0.5"], gutter=0) setiap kali override `margins`.
      margins: { top: "3cm", right: "2cm", bottom: "2cm", left: "3cm", header: 720, footer: 720, gutter: 0 },
      table:      { row: { cantSplit: true } },
    });

    const namaOpdSlug = namaOpd.replace(/\s+/g, "");
    const filename = `LAKIP_${tahun}_${namaOpdSlug}.docx`;
    res.setHeader("Content-Type",        "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control",       "no-store");
    return res.end(Buffer.from(docxBuffer));

  } catch (err) {
    console.error("[lakipExport] DOCX error:", err.message);
    return res.status(500).json({ success: false, message: "Gagal generate DOCX: " + err.message });
  }
};
