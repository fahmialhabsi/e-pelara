"use strict";

const { Op } = require("sequelize");
const htmlToDocx = require("html-to-docx");
const PDFDocument = require("pdfkit");

function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function numStr(v) {
  if (v == null || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("id-ID") : String(v);
}

/**
 * Ambil log terbaru per (entity_id, field_key) untuk rkpd_item dalam dokumen.
 */
async function loadLatestRkpdItemLogs(db, rkpdItemIds) {
  const { PlanningLineItemChangeLog } = db;
  if (!rkpdItemIds.length) return new Map();
  const rows = await PlanningLineItemChangeLog.findAll({
    where: {
      entity_type: "rkpd_item",
      entity_id: { [Op.in]: rkpdItemIds },
    },
    order: [["created_at", "DESC"]],
  });
  const map = new Map();
  for (const r of rows) {
    const k = `${r.entity_id}:${r.field_key}`;
    if (!map.has(k)) map.set(k, r);
  }
  return map;
}

function buildRkpdHtml(dok, items, logMap, { includeDiff }) {
  const judul = esc(dok.judul);
  const tahun = esc(dok.tahun);
  const periode = dok.periode
    ? `${dok.periode.tahun_awal}–${dok.periode.tahun_akhir}`
    : "-";

  const hasAnyLog =
    includeDiff && logMap && [...logMap.values()].length > 0;

  let header;
  if (!includeDiff || !hasAnyLog) {
    header = `<tr><th>No</th><th>Program</th><th>Kegiatan</th><th>Sub kegiatan</th><th>Indikator</th><th>Target</th><th>Pagu</th></tr>`;
  } else {
    header = `<tr><th>No</th><th>Program</th><th>Kegiatan</th><th>Sub kegiatan</th><th>Indikator</th><th>Target (lama)</th><th>Target (baru)</th><th>Pagu (lama)</th><th>Pagu (baru)</th></tr>`;
  }

  const body = items
    .map((it, idx) => {
      const logT = logMap?.get(`${it.id}:target`);
      const logP = logMap?.get(`${it.id}:pagu`);
      if (!includeDiff || !hasAnyLog) {
        return `<tr>
        <td>${idx + 1}</td>
        <td>${esc(it.program)}</td>
        <td>${esc(it.kegiatan)}</td>
        <td>${esc(it.sub_kegiatan)}</td>
        <td>${esc(it.indikator)}</td>
        <td>${esc(numStr(it.target))}</td>
        <td>${esc(numStr(it.pagu))}</td>
      </tr>`;
      }
      return `<tr>
        <td>${idx + 1}</td>
        <td>${esc(it.program)}</td>
        <td>${esc(it.kegiatan)}</td>
        <td>${esc(it.sub_kegiatan)}</td>
        <td>${esc(it.indikator)}</td>
        <td>${logT ? esc(logT.old_value) : "—"}</td>
        <td>${logT ? esc(logT.new_value) : esc(numStr(it.target))}</td>
        <td>${logP ? esc(logP.old_value) : "—"}</td>
        <td>${logP ? esc(logP.new_value) : esc(numStr(it.pagu))}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
    <h1>Preview — data perencanaan RKPD (internal aplikasi)</h1>
    <p><strong>Bukan dokumen RKPD resmi</strong> sesuai format peraturan/perda setempat. Ini hanya ringkasan baris dari basis data perencanaan.</p>
    <p><strong>Judul:</strong> ${judul}</p>
    <p><strong>Tahun:</strong> ${tahun} &nbsp; <strong>Periode RPJMD:</strong> ${esc(periode)}</p>
    <p><strong>Status:</strong> ${esc(dok.status)} &nbsp; <strong>Versi:</strong> ${esc(String(dok.versi))}</p>
    <p class="small">Sumber: <code>rkpd_dokumen</code>, <code>rkpd_item</code>.</p>
    ${includeDiff && hasAnyLog ? "<p><em>Mode perubahan: kolom lama/baru dari <code>planning_line_item_change_log</code>.</em></p>" : ""}
    <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:10pt;">
      <thead>${header}</thead>
      <tbody>${body}</tbody>
    </table>
  </body></html>`;
}

async function buildRkpdDokumenDocx(db, dokumenId, options = {}) {
  const { RkpdDokumen, RkpdItem, PeriodeRpjmd } = db;
  const includeDiff = !!options.includeDiff;

  const dok = await RkpdDokumen.findByPk(dokumenId, {
    include: [{ model: PeriodeRpjmd, as: "periode", required: false }],
  });
  if (!dok) throw new Error("rkpd_dokumen tidak ditemukan");

  const items = await RkpdItem.findAll({
    where: { rkpd_dokumen_id: dokumenId },
    order: [
      ["urutan", "ASC"],
      ["id", "ASC"],
    ],
  });

  const ids = items.map((i) => i.id);
  const logMap = includeDiff
    ? await loadLatestRkpdItemLogs(db, ids)
    : new Map();

  const html = buildRkpdHtml(dok, items, logMap, { includeDiff });
  return htmlToDocx(html, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
  });
}

/** Preview perencanaan: html-to-docx — ringkasan baris internal, bukan dokumen Renja OPD resmi (lihat planningOfficialDocumentEngine). */
async function buildRenjaDokumenDocx(db, dokumenId) {
  const { RenjaDokumen, RenjaItem, PeriodeRpjmd, PerangkatDaerah, RkpdDokumen, RenstraPdDokumen } =
    db;

  const dok = await RenjaDokumen.findByPk(dokumenId, {
    include: [
      { model: PeriodeRpjmd, as: "periode", required: false },
      { model: PerangkatDaerah, as: "perangkatDaerah", required: false },
      { model: RkpdDokumen, as: "rkpdDokumen", required: false },
      { model: RenstraPdDokumen, as: "renstraPdDokumen", required: false },
    ],
  });
  if (!dok) throw new Error("renja_dokumen tidak ditemukan");

  const items = await RenjaItem.findAll({
    where: { renja_dokumen_id: dokumenId },
    order: [
      ["urutan", "ASC"],
      ["id", "ASC"],
    ],
  });

  const pd = dok.perangkatDaerah?.nama || dok.perangkat_daerah_id;
  const judul = esc(dok.judul);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
    <h1>Preview — data perencanaan Renja (internal aplikasi)</h1>
    <p><strong>Bukan dokumen Renja OPD resmi</strong> (tidak memuat pendahuluan, evaluasi tahun lalu, sistematika bab sesuai pedoman daerah, dll.). Ini hanya metadata + tabel baris dari <code>renja_item</code>.</p>
    <p><strong>Perangkat daerah:</strong> ${esc(pd)}</p>
    <p><strong>Judul:</strong> ${judul}</p>
    <p><strong>Tahun:</strong> ${esc(dok.tahun)}</p>
    <p><strong>RKPD acuan:</strong> ${dok.rkpdDokumen ? esc(dok.rkpdDokumen.judul) : "—"}</p>
    <p><strong>Renstra PD:</strong> ${dok.renstraPdDokumen ? esc(dok.renstraPdDokumen.judul) : "—"}</p>
    <p><strong>legacy_renja_id:</strong> ${dok.legacy_renja_id ?? "—"} <span class="small">(jembatan RKA/DPA, bukan pagu Renja v2)</span></p>
    <h2>Ringkasan baris perencanaan</h2>
    <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:10pt;">
    <thead><tr><th>No</th><th>Program</th><th>Kegiatan</th><th>Sub</th><th>Indikator</th><th>Target</th><th>Pagu</th></tr></thead>
    <tbody>
    ${items
      .map(
        (it, i) =>
          `<tr><td>${i + 1}</td><td>${esc(it.program)}</td><td>${esc(it.kegiatan)}</td><td>${esc(it.sub_kegiatan)}</td><td>${esc(it.indikator)}</td><td>${esc(numStr(it.target))}</td><td>${esc(numStr(it.pagu))}</td></tr>`,
      )
      .join("")}
    </tbody></table>
  </body></html>`;

  return htmlToDocx(html, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
  });
}

function buildPdfBufferFromLines(title, lines) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(14).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(9);
    lines.forEach((ln) => {
      doc.text(ln, { width: 500 });
      doc.moveDown(0.3);
    });
    doc.end();
  });
}

async function buildRkpdDokumenPdf(db, dokumenId) {
  const { RkpdDokumen, RkpdItem, PeriodeRpjmd } = db;
  const dok = await RkpdDokumen.findByPk(dokumenId, {
    include: [{ model: PeriodeRpjmd, as: "periode", required: false }],
  });
  if (!dok) throw new Error("rkpd_dokumen tidak ditemukan");
  const items = await RkpdItem.findAll({
    where: { rkpd_dokumen_id: dokumenId },
    order: [
      ["urutan", "ASC"],
      ["id", "ASC"],
    ],
  });
  const lines = [
    `Judul: ${dok.judul}`,
    `Tahun: ${dok.tahun} | Status: ${dok.status}`,
    `---`,
    ...items.map(
      (it, i) =>
        `${i + 1}. ${it.program || ""} / ${it.kegiatan || ""} / ${it.sub_kegiatan || ""} | pagu: ${numStr(it.pagu)}`,
    ),
  ];
  const previewLines = [
    "[PREVIEW INTERNAL — BUKAN DOKUMEN RKPD RESMI]",
    "Ringkasan data dari rkpd_dokumen / rkpd_item.",
    "",
    ...lines,
  ];
  return buildPdfBufferFromLines(`Preview RKPD (internal) — ${dok.judul}`, previewLines);
}

async function buildRenjaDokumenPdf(db, dokumenId) {
  const { RenjaDokumen, RenjaItem, PerangkatDaerah } = db;
  const dok = await RenjaDokumen.findByPk(dokumenId, {
    include: [{ model: PerangkatDaerah, as: "perangkatDaerah", required: false }],
  });
  if (!dok) throw new Error("renja_dokumen tidak ditemukan");
  const items = await RenjaItem.findAll({
    where: { renja_dokumen_id: dokumenId },
    order: [
      ["urutan", "ASC"],
      ["id", "ASC"],
    ],
  });
  const lines = [
    "[PREVIEW INTERNAL — BUKAN DOKUMEN RENJA OPD RESMI]",
    `PD: ${dok.perangkatDaerah?.nama || dok.perangkat_daerah_id}`,
    `Judul: ${dok.judul} | Tahun: ${dok.tahun}`,
    "---",
    ...items.map(
      (it, i) =>
        `${i + 1}. ${it.program || ""} | ${it.sub_kegiatan || ""} | pagu: ${numStr(it.pagu)}`,
    ),
  ];
  return buildPdfBufferFromLines(`Preview Renja (internal) — ${dok.judul}`, lines);
}

module.exports = {
  buildRkpdDokumenDocx,
  buildRenjaDokumenDocx,
  buildRkpdDokumenPdf,
  buildRenjaDokumenPdf,
};
