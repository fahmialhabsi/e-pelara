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
const PRINT_CSS = `
<style>
  .toolbar { display: none !important; }
  .content-wrapper { margin-top: 0 !important; }
  body { font-size: 11pt; }
  .page {
    width: 210mm;
    padding: 20mm 15mm 20mm 25mm !important;
    margin: 0 !important;
    page-break-after: always;
  }
  .page:last-child { page-break-after: avoid; }
  @page {
    size: A4 portrait;
    margin: 0;
  }
</style>
`;

function injectPrintCss(html) {
  return html.replace("</head>", PRINT_CSS + "</head>");
}

// ── PDF Export ────────────────────────────────────────────────────────────────

exports.exportPdf = async (req, res) => {
  const { tahun = String(new Date().getFullYear()), periode_id = "1" } = req.query;
  let browser;

  try {
    // Ambil HTML dari generator
    const rawHtml = await getHtml(req);
    const html    = injectPrintCss(rawHtml);

    // Launch Chromium
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
    });

    const page = await browser.newPage();

    // Set content langsung (tidak perlu server HTTP tambahan)
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

    // Generate PDF A4
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "15mm", left: "10mm", right: "10mm" },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size:8pt; color:#888; width:100%; padding:0 10mm; display:flex; justify-content:space-between;">
          <span>LAKIP/LKj Tahun ${tahun} — Dinas Ketahanan Pangan Maluku Utara</span>
          <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>`,
      footerTemplate: `
        <div style="font-size:7pt; color:#aaa; width:100%; text-align:center; padding:0 10mm;">
          Dokumen ini digenerate secara otomatis oleh sistem ePeLARA pada ${new Date().toLocaleDateString("id-ID")}
        </div>`,
    });

    const filename = `LAKIP_${tahun}_DinasKetahananPangan.pdf`;
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

// ── Build clean DOCX-safe HTML ────────────────────────────────────────────────
function buildDocxHtml(data) {
  const { meta, visi, misi, sasaran, indikator, lakipEntries, anggaran } = data;
  const tahun = meta.tahun;
  const opd   = meta.opd;

  const escH = (s) => !s ? "" : String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const fmtRp = (n) => "Rp " + (parseFloat(n)||0).toLocaleString("id-ID");

  const indRows = indikator.length
    ? indikator.map((ind, i) => `
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

  <h3>Capaian Indikator Kinerja Tahun ${escH(tahun)}</h3>
  <table border="1" cellpadding="4" cellspacing="0" width="100%">
    <thead>
      <tr>
        <th>No</th><th>Indikator</th><th>Satuan</th>
        <th>Target</th><th>Realisasi</th><th>Capaian</th><th>Status</th>
      </tr>
    </thead>
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

exports.exportDocx = async (req, res) => {
  const { tahun = String(new Date().getFullYear()) } = req.query;

  try {
    // Gunakan JSON data dari generator (bukan HTML — lebih aman untuk DOCX)
    const dataRes = await new Promise((resolve, reject) => {
      let captured = null;
      const fakeRes = {
        json: (d) => { captured = d; resolve(d); },
        status: (c) => ({ json: (d) => reject(new Error(`${c}: ${JSON.stringify(d)}`) ) }),
      };
      genCtrl.getData(req, fakeRes).catch(reject);
    });

    const data     = dataRes?.data || dataRes;
    const docxHtml = buildDocxHtml(data);

    const docxBuffer = await HTMLtoDOCX(docxHtml, null, {
      title:      `LAKIP ${tahun} — Dinas Ketahanan Pangan Maluku Utara`,
      subject:    "Laporan Akuntabilitas Kinerja Instansi Pemerintah",
      creator:    "ePeLARA",
      footer:     true,
      pageNumber: true,
      font:       "Times New Roman",
      fontSize:   24,
      margins:    { top: 1440, right: 1008, bottom: 1440, left: 1440 },
      table:      { row: { cantSplit: true } },
    });

    const filename = `LAKIP_${tahun}_DinasKetahananPangan.docx`;
    res.setHeader("Content-Type",        "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control",       "no-store");
    return res.end(Buffer.from(docxBuffer));

  } catch (err) {
    console.error("[lakipExport] DOCX error:", err.message);
    return res.status(500).json({ success: false, message: "Gagal generate DOCX: " + err.message });
  }
};
