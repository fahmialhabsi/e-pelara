"use strict";

/**
 * Document engine — dokumen Renja OPD & RKPD resmi (struktur bab, bukan HTML preview).
 * DOCX: OOXML via library `docx`. PDF: pdfkit dengan tabel terstruktur.
 */

const { Op } = require("sequelize");
const PDFDocument = require("pdfkit");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} = require("docx");

function numId(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("id-ID") : String(v);
}

function plain(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

async function loadFieldChangeLogs(db, entityType, itemIds) {
  const { PlanningLineItemChangeLog } = db;
  if (!itemIds || !itemIds.length) return [];
  return PlanningLineItemChangeLog.findAll({
    where: {
      entity_type: entityType,
      entity_id: { [Op.in]: itemIds },
    },
    order: [
      ["created_at", "ASC"],
      ["id", "ASC"],
    ],
  });
}

/**
 * Konteks untuk Renja OPD resmi — dipakai DOCX & PDF.
 * (Tanpa teks placeholder panjang — prasyarat validasi di layar ekspor.)
 */
async function loadRenjaOfficialContext(db, dokumenId) {
  const {
    RenjaDokumen,
    RenjaItem,
    PeriodeRpjmd,
    PerangkatDaerah,
    RkpdDokumen,
    RenstraPdDokumen,
  } = db;
  const RenstraTujuan = db.RenstraTujuan;

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

  const pdNama = dok.perangkatDaerah?.nama || `PD #${dok.perangkat_daerah_id}`;
  const pdKode = dok.perangkatDaerah?.kode || "";
  const periodeStr = dok.periode
    ? `${dok.periode.tahun_awal}–${dok.periode.tahun_akhir}`
    : "—";

  const renstraPd = dok.renstraPdDokumen;
  let tujuanLines = [];
  if (renstraPd?.renstra_opd_id && RenstraTujuan) {
    const rows = await RenstraTujuan.findAll({
      where: { renstra_id: renstraPd.renstra_opd_id },
      order: [["no_tujuan", "ASC"]],
      limit: 40,
    });
    tujuanLines = rows.map((r, i) => {
      const no = r.no_tujuan || String(i + 1);
      const isi = plain(r.isi_tujuan || r.isi_tujuan_rpjmd || "");
      return isi ? `${no}. ${isi}` : null;
    }).filter(Boolean);
  }

  const renjaTahunLalu = await RenjaDokumen.findOne({
    where: {
      perangkat_daerah_id: dok.perangkat_daerah_id,
      periode_id: dok.periode_id,
      tahun: dok.tahun - 1,
    },
    include: [{ model: RenjaItem, as: "items", required: false }],
  });

  let bab2Default = "";
  if (dok.text_bab2 && String(dok.text_bab2).trim()) {
    bab2Default = String(dok.text_bab2).trim();
  } else if (renjaTahunLalu) {
    const its = renjaTahunLalu.items || [];
    const tot = its.reduce((a, r) => a + (Number(r.pagu) || 0), 0);
    bab2Default =
      `Evaluasi pelaksanaan Renja tahun ${dok.tahun - 1} (${pdNama}): dokumen acuan "${plain(renjaTahunLalu.judul)}", ` +
      `${its.length} baris rencana, total pagu indikatif tahun lalu Rp ${numId(tot)}.`;
  } else {
    bab2Default = "—";
  }

  const bab1 =
    dok.text_bab1 ||
    `Dokumen ini menyusun Rencana Kerja Perangkat Daerah (Renja OPD) untuk ${pdNama}${pdKode ? ` (${pdKode})` : ""} ` +
      `pada tahun ${dok.tahun}, dalam kerangka periode RPJMD ${periodeStr}. ` +
      `Renja ini merupakan penjabaran rencana strategis perangkat daerah ke dalam kegiatan, indikator, dan alokasi pendanaan. ` +
      `Dokumen disusun melalui aplikasi ePelara dengan mengacu pada Renstra PD dan (jika dipilih) dokumen RKPD.`;

  const bab3Intro = `Acuan Renstra Perangkat Daerah: "${plain(renstraPd?.judul || "—")}".`;
  const bab3Body = tujuanLines.length > 0 ? tujuanLines.join("\n\n") : "—";

  const bab5 =
    dok.text_bab5 ||
    `Demikian Renja Perangkat Daerah ini disusun sebagai pedoman pelaksanaan rencana kerja tahun ${dok.tahun}. ` +
      `Perubahan substantif mengikuti mekanisme perencanaan dan peraturan perundangan yang berlaku.`;

  return {
    dok,
    items,
    meta: {
      judulResmi: `RENCANA KERJA PERANGKAT DAERAH (RENJA OPD)\n${pdNama}\nTAHUN ${dok.tahun}`,
      pdNama,
      pdKode,
      periodeStr,
      bab1,
      bab2: bab2Default,
      bab3Title: bab3Intro,
      bab3Tujuan: bab3Body,
      bab5,
      rkpdJudul: dok.rkpdDokumen?.judul || null,
      renstraJudul: renstraPd?.judul || null,
    },
  };
}

async function loadRkpdOfficialContext(db, dokumenId) {
  const { RkpdDokumen, RkpdItem, PeriodeRpjmd } = db;
  const dok = await RkpdDokumen.findByPk(dokumenId, {
    include: [{ model: PeriodeRpjmd, as: "periode", required: false }],
  });
  if (!dok) throw new Error("rkpd_dokumen tidak ditemukan");
  const bab2Rkpd = dok.text_bab2 && String(dok.text_bab2).trim() ? String(dok.text_bab2).trim() : "—";
  const items = await RkpdItem.findAll({
    where: { rkpd_dokumen_id: dokumenId },
    order: [
      ["urutan", "ASC"],
      ["id", "ASC"],
    ],
  });
  const periodeStr = dok.periode
    ? `${dok.periode.tahun_awal}–${dok.periode.tahun_akhir}`
    : "—";
  const priSet = new Set();
  for (const it of items) {
    const p = plain(it.prioritas_daerah);
    if (p) priSet.add(p);
  }
  const prioritasList = [...priSet].slice(0, 30);

  return {
    dok,
    items,
    meta: {
      judulResmi: `RENCANA KERJA PEMERINTAH DAERAH (RKPD)\nTAHUN ${dok.tahun}`,
      periodeStr,
      bab1:
        `Dokumen ini menyusun Rencana Kerja Pemerintah Daerah (RKPD) tahun ${dok.tahun} ` +
        `dalam kerangka periode RPJMD ${periodeStr}. RKPD memuat prioritas pembangunan dan ` +
        `rencana program–kegiatan beserta indikator dan pagu indikatif.`,
      bab2: bab2Rkpd,
      bab3:
        prioritasList.length > 0
          ? prioritasList.map((p, i) => `${i + 1}. ${p}`).join("\n\n")
          : "—",
      bab5:
        `Demikian RKPD ini disusun sebagai landasan perencanaan tahunan. Perubahan mengikuti ketentuan perundangan dan tahapan musrenbang.`,
    },
  };
}

function paragraphBlocks(text, sizeHalfPt = 22) {
  const t = String(text || "").trim();
  if (!t) return [new Paragraph("")];
  return t.split(/\n{2,}/).map(
    (block) =>
      new Paragraph({
        children: [
          new TextRun({
            text: block.replace(/\n/g, " "),
            size: sizeHalfPt,
            font: "Arial",
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
      }),
  );
}

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 200 },
  });
}

function heading2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 160 },
  });
}

function renjaItemTableRows(items) {
  const header = new TableRow({
    children: [
      cell("No", true),
      cell("Program", true),
      cell("Kegiatan", true),
      cell("Sub kegiatan", true),
      cell("Indikator", true),
      cell("Target", true),
      cell("Pagu (Rp)", true),
    ],
  });
  const body = items.map((it, i) =>
    new TableRow({
      children: [
        cell(String(i + 1), false),
        cell(plain(it.program), false),
        cell(plain(it.kegiatan), false),
        cell(plain(it.sub_kegiatan), false),
        cell(plain(it.indikator), false),
        cell(numId(it.target), false),
        cell(numId(it.pagu), false),
      ],
    }),
  );
  return [header, ...body];
}

function rkpdItemTableRows(items) {
  const header = new TableRow({
    children: [
      cell("No", true),
      cell("Program", true),
      cell("Kegiatan", true),
      cell("Sub kegiatan", true),
      cell("Indikator", true),
      cell("Target", true),
      cell("Pagu (Rp)", true),
    ],
  });
  const body = items.map((it, i) =>
    new TableRow({
      children: [
        cell(String(i + 1), false),
        cell(plain(it.program), false),
        cell(plain(it.kegiatan), false),
        cell(plain(it.sub_kegiatan), false),
        cell(plain(it.indikator), false),
        cell(numId(it.target), false),
        cell(numId(it.pagu), false),
      ],
    }),
  );
  return [header, ...body];
}

function diffLogTableRows(logs) {
  const header = new TableRow({
    children: [
      cell("No", true),
      cell("ID baris", true),
      cell("Field", true),
      cell("Nilai lama", true),
      cell("Nilai baru", true),
      cell("Waktu", true),
    ],
  });
  const body = (logs || []).map((log, i) =>
    new TableRow({
      children: [
        cell(String(i + 1), false),
        cell(String(log.entity_id), false),
        cell(plain(log.field_key), false),
        cell(plain(log.old_value).slice(0, 500), false),
        cell(plain(log.new_value).slice(0, 500), false),
        cell(log.created_at ? String(log.created_at) : "—", false),
      ],
    }),
  );
  return [header, ...body];
}

function cell(text, bold) {
  return new TableCell({
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
    },
    width: { size: 14, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text),
            bold: !!bold,
            size: 18,
            font: "Arial",
          }),
        ],
      }),
    ],
  });
}

async function buildRenjaOpdOfficialDocx(db, dokumenId, options = {}) {
  const { dok, items, meta } = await loadRenjaOfficialContext(db, dokumenId);
  const docVersion = options.documentVersion != null ? options.documentVersion : dok.versi;
  const itemIds = items.map((i) => i.id);
  const changeLogs =
    options.includeChangeLog === false
      ? []
      : await loadFieldChangeLogs(db, "renja_item", itemIds);

  const children = [
    new Paragraph({
      children: [
        new TextRun({
          text: "DOKUMEN RESMI — RENJA OPD",
          bold: true,
          size: 28,
          font: "Arial",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: meta.judulResmi,
          bold: true,
          size: 24,
          font: "Arial",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Versi dokumen: ${docVersion} · Status: ${dok.status}`,
          italics: true,
          size: 20,
          font: "Arial",
        }),
      ],
      spacing: { after: 200 },
    }),
    heading1("BAB I — PENDAHULUAN"),
    ...paragraphBlocks(meta.bab1),
    heading1("BAB II — EVALUASI PELAKSANAAN RENJA TAHUN LALU"),
    ...paragraphBlocks(meta.bab2),
    heading1("BAB III — TUJUAN DAN SASARAN PERANGKAT DAERAH"),
    ...paragraphBlocks(meta.bab3Title),
    ...paragraphBlocks(meta.bab3Tujuan),
    heading1("BAB IV — RENCANA KERJA DAN PENDANAAN"),
    heading2("4.1 Acuan perencanaan"),
    ...paragraphBlocks(
      `RKPD acuan: ${meta.rkpdJudul || "—"}\nRenstra PD: ${meta.renstraJudul || "—"}`,
    ),
    heading2("4.2 Program, kegiatan, indikator, target, dan pagu indikatif"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: renjaItemTableRows(items),
    }),
    heading1("BAB V — PENUTUP"),
    ...paragraphBlocks(meta.bab5),
  ];

  if (changeLogs.length) {
    children.push(
      heading1("LAMPIRAN — RIWAYAT PERUBAHAN NILAI"),
      ...paragraphBlocks(
        "Perubahan nilai pada baris rencana (sumber: basis data audit perencanaan).",
      ),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: diffLogTableRows(changeLogs),
      }),
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text:
            "Catatan teknis: dokumen dihasilkan oleh Document Engine ePelara (OOXML). Pengesahan mengikuti peraturan daerah.",
          italics: true,
          size: 18,
          color: "444444",
          font: "Arial",
        }),
      ],
      spacing: { before: 400 },
    }),
  );

  const doc = new Document({
    creator: "ePelara",
    title: `Renja OPD — ${meta.pdNama} — ${dok.tahun}`,
    description: "Dokumen resmi struktur bab — bukan preview tabel internal semata",
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

async function buildRkpdOfficialDocx(db, dokumenId, options = {}) {
  const { dok, items, meta } = await loadRkpdOfficialContext(db, dokumenId);
  const docVersion = options.documentVersion != null ? options.documentVersion : dok.versi;
  const itemIds = items.map((i) => i.id);
  const changeLogs =
    options.includeChangeLog === false
      ? []
      : await loadFieldChangeLogs(db, "rkpd_item", itemIds);

  const children = [
    new Paragraph({
      children: [
        new TextRun({
          text: "DOKUMEN RESMI — RKPD",
          bold: true,
          size: 28,
          font: "Arial",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: meta.judulResmi,
          bold: true,
          size: 24,
          font: "Arial",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Versi dokumen: ${docVersion} · Status: ${dok.status}`,
          italics: true,
          size: 20,
          font: "Arial",
        }),
      ],
      spacing: { after: 200 },
    }),
    heading1("BAB I — PENDAHULUAN"),
    ...paragraphBlocks(meta.bab1),
    heading1("BAB II — ANALISIS KONDISI DAN KEBIJAKAN"),
    ...paragraphBlocks(meta.bab2),
    heading1("BAB III — PRIORITAS PEMBANGUNAN DAERAH"),
    ...paragraphBlocks(meta.bab3),
    heading1("BAB IV — RENCANA PROGRAM, KEGIATAN, DAN PENDANAAN"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rkpdItemTableRows(items),
    }),
    heading1("BAB V — PENUTUP"),
    ...paragraphBlocks(meta.bab5),
  ];

  if (changeLogs.length) {
    children.push(
      heading1("LAMPIRAN — RIWAYAT PERUBAHAN NILAI"),
      ...paragraphBlocks(
        "Perubahan nilai pada baris RKPD (sumber: basis data audit perencanaan).",
      ),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: diffLogTableRows(changeLogs),
      }),
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text:
            "Catatan teknis: dokumen dihasilkan oleh Document Engine ePelara (OOXML). Pengesahan mengikuti peraturan daerah.",
          italics: true,
          size: 18,
          color: "444444",
          font: "Arial",
        }),
      ],
      spacing: { before: 400 },
    }),
  );

  const doc = new Document({
    creator: "ePelara",
    title: `RKPD — ${dok.judul}`,
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}

function pdfBufferFromBuilder(buildFn) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 56, size: "A4" });
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      buildFn(doc);
    } catch (e) {
      reject(e);
    }
    doc.end();
  });
}

/** Tabel berbingkai (garis horisontal + vertikal) agar PDF mendekati layout Word. */
function drawPdfGridTable(pdf, opts) {
  const { left, yStart, width, rowH, cols, headers, rows, fontSize = 7 } = opts;
  const rowCount = 1 + rows.length;
  const totalH = rowH * rowCount;
  pdf.save();
  pdf.lineWidth(0.45).strokeColor("#333333");
  for (let r = 0; r <= rowCount; r += 1) {
    pdf
      .moveTo(left, yStart + r * rowH)
      .lineTo(left + width, yStart + r * rowH)
      .stroke();
  }
  let vx = left;
  pdf.moveTo(vx, yStart).lineTo(vx, yStart + totalH).stroke();
  for (let i = 0; i < cols.length; i += 1) {
    vx += cols[i];
    pdf.moveTo(vx, yStart).lineTo(vx, yStart + totalH).stroke();
  }
  pdf.fontSize(fontSize).fillColor("#111111");
  xPos = left;
  headers.forEach((h, i) => {
    pdf.text(String(h), xPos + 2, yStart + 4, { width: cols[i] - 4 });
    xPos += cols[i];
  });
  let y = yStart + rowH;
  rows.forEach((row) => {
    xPos = left;
    row.forEach((cell, i) => {
      pdf.text(String(cell).slice(0, 250), xPos + 2, y + 4, { width: cols[i] - 4 });
      xPos += cols[i];
    });
    y += rowH;
  });
  pdf.restore();
  const bottom = yStart + totalH + 10;
  pdf.y = bottom;
  return bottom;
}

const PDF_ITEM_COLS = [46, 78, 78, 78, 86, 60, 69];

function itemRowsForPdf(items) {
  return items.map((it, i) => [
    String(i + 1),
    plain(it.program).slice(0, 120),
    plain(it.kegiatan).slice(0, 120),
    plain(it.sub_kegiatan).slice(0, 120),
    plain(it.indikator).slice(0, 120),
    numId(it.target),
    numId(it.pagu),
  ]);
}

function pdfAppendChangeLog(pdf, changeLogs, entityLabel) {
  if (!changeLogs.length) return;
  pdf.addPage();
  pdf.fontSize(12).fillColor("#000000").text("LAMPIRAN — RIWAYAT PERUBAHAN NILAI", { underline: true });
  pdf.moveDown(0.4);
  pdf
    .fontSize(9)
    .fillColor("#333333")
    .text(
      `Perubahan nilai pada baris ${entityLabel} (sumber: basis data audit perencanaan).`,
      { align: "justify" },
    );
  pdf.moveDown(0.5);
  const cols = [26, 32, 58, 108, 108, 62];
  const width = cols.reduce((a, b) => a + b, 0);
  const headers = ["No", "ID baris", "Field", "Nilai lama", "Nilai baru", "Waktu"];
  const rows = changeLogs.map((log, i) => [
    String(i + 1),
    String(log.entity_id),
    plain(log.field_key),
    plain(log.old_value).slice(0, 400),
    plain(log.new_value).slice(0, 400),
    log.created_at ? String(log.created_at) : "—",
  ]);
  let yStart = pdf.y;
  const rowH = 40;
  if (yStart > 680) {
    pdf.addPage();
    yStart = 50;
  }
  drawPdfGridTable(pdf, {
    left: 50,
    yStart,
    width,
    rowH,
    cols,
    headers,
    rows,
    fontSize: 6,
  });
  pdf.moveDown(0.3);
}

async function buildRenjaOpdOfficialPdf(db, dokumenId, options = {}) {
  const { dok, items, meta } = await loadRenjaOfficialContext(db, dokumenId);
  const docVersion = options.documentVersion != null ? options.documentVersion : dok.versi;
  const itemIds = items.map((i) => i.id);
  const changeLogs =
    options.includeChangeLog === false
      ? []
      : await loadFieldChangeLogs(db, "renja_item", itemIds);

  return pdfBufferFromBuilder((pdf) => {
    pdf.fontSize(9).fillColor("#333333");
    pdf.fontSize(14).text("DOKUMEN RESMI — RENJA OPD", { align: "center" });
    pdf.moveDown(0.5);
    pdf.fontSize(11).text(meta.judulResmi, { align: "center" });
    pdf.moveDown(1);
    pdf
      .fontSize(9)
      .text(`Versi dokumen: ${docVersion} · Status: ${dok.status}`, { align: "center" });
    pdf.moveDown(1.2);

    const section = (bab, body) => {
      pdf.fontSize(12).fillColor("#000000").text(bab, { underline: true });
      pdf.moveDown(0.4);
      pdf.fontSize(10).fillColor("#333333").text(body, { align: "justify" });
      pdf.moveDown(0.8);
    };

    section("BAB I — PENDAHULUAN", meta.bab1);
    section("BAB II — EVALUASI PELAKSANAAN RENJA TAHUN LALU", meta.bab2);
    section("BAB III — TUJUAN DAN SASARAN PERANGKAT DAERAH", `${meta.bab3Title}\n\n${meta.bab3Tujuan}`);
    pdf.addPage();
    pdf.fontSize(12).fillColor("#000000").text("BAB IV — RENCANA KERJA DAN PENDANAAN", { underline: true });
    pdf.moveDown(0.5);
    pdf.fontSize(9).text(`RKPD acuan: ${meta.rkpdJudul || "—"}\nRenstra PD: ${meta.renstraJudul || "—"}`);
    pdf.moveDown(0.6);
    pdf.fontSize(10).text("Tabel rencana kerja dan pendanaan:");
    pdf.moveDown(0.35);
    const headers = ["No", "Program", "Kegiatan", "Sub", "Indikator", "Target", "Pagu"];
    const rows = itemRowsForPdf(items);
    const width = PDF_ITEM_COLS.reduce((a, b) => a + b, 0);
    const rowH = 16;
    const maxY = 720;
    let yStart = pdf.y;
    if (yStart > 560) {
      pdf.addPage();
      yStart = 50;
    }
    for (let off = 0; off < rows.length; off += 15) {
      const chunk = rows.slice(off, off + 15);
      const estH = rowH * (chunk.length + 1);
      if (yStart + estH > maxY) {
        pdf.addPage();
        yStart = 50;
      }
      drawPdfGridTable(pdf, {
        left: 50,
        yStart,
        width,
        rowH,
        cols: PDF_ITEM_COLS,
        headers,
        rows: chunk,
        fontSize: 6,
      });
      yStart = pdf.y;
      if (off + 15 < rows.length) {
        pdf.addPage();
        yStart = 50;
      }
    }
    pdf.addPage();
    section("BAB V — PENUTUP", meta.bab5);
    pdfAppendChangeLog(pdf, changeLogs, "Renja");
    pdf.fontSize(8).fillColor("#666666").text(
      "Dokumen resmi (PDF) — ePelara. Bukan preview tabel internal.",
      { align: "left" },
    );
  });
}

async function buildRkpdOfficialPdf(db, dokumenId, options = {}) {
  const { dok, items, meta } = await loadRkpdOfficialContext(db, dokumenId);
  const docVersion = options.documentVersion != null ? options.documentVersion : dok.versi;
  const itemIds = items.map((i) => i.id);
  const changeLogs =
    options.includeChangeLog === false
      ? []
      : await loadFieldChangeLogs(db, "rkpd_item", itemIds);

  return pdfBufferFromBuilder((pdf) => {
    pdf.fontSize(14).text("DOKUMEN RESMI — RKPD", { align: "center" });
    pdf.moveDown(0.5);
    pdf.fontSize(11).text(meta.judulResmi, { align: "center" });
    pdf.moveDown(0.8);
    pdf
      .fontSize(9)
      .text(`Versi dokumen: ${docVersion} · Status: ${dok.status}`, { align: "center" });
    pdf.moveDown(1);

    const section = (bab, body) => {
      pdf.fontSize(12).text(bab, { underline: true });
      pdf.moveDown(0.4);
      pdf.fontSize(10).text(body, { align: "justify" });
      pdf.moveDown(0.8);
    };
    section("BAB I — PENDAHULUAN", meta.bab1);
    section("BAB II — ANALISIS KONDISI DAN KEBIJAKAN", meta.bab2);
    section("BAB III — PRIORITAS PEMBANGUNAN DAERAH", meta.bab3);
    pdf.addPage();
    pdf.fontSize(12).text("BAB IV — RENCANA PROGRAM, KEGIATAN, DAN PENDANAAN", { underline: true });
    pdf.moveDown(0.5);
    const headers = ["No", "Program", "Kegiatan", "Sub", "Indikator", "Target", "Pagu"];
    const rows = itemRowsForPdf(items);
    const width = PDF_ITEM_COLS.reduce((a, b) => a + b, 0);
    const rowH = 16;
    const maxY = 720;
    let yStart = pdf.y;
    for (let off = 0; off < rows.length; off += 15) {
      const chunk = rows.slice(off, off + 15);
      const estH = rowH * (chunk.length + 1);
      if (yStart + estH > maxY) {
        pdf.addPage();
        yStart = 50;
      }
      drawPdfGridTable(pdf, {
        left: 50,
        yStart,
        width,
        rowH,
        cols: PDF_ITEM_COLS,
        headers,
        rows: chunk,
        fontSize: 6,
      });
      yStart = pdf.y;
      if (off + 15 < rows.length) {
        pdf.addPage();
        yStart = 50;
      }
    }
    pdf.addPage();
    section("BAB V — PENUTUP", meta.bab5);
    pdfAppendChangeLog(pdf, changeLogs, "RKPD");
    pdf.fontSize(8).fillColor("#666666").text(`Dokumen RKPD resmi · ${plain(dok.judul)}`, {
      align: "left",
    });
  });
}

module.exports = {
  loadRenjaOfficialContext,
  loadRkpdOfficialContext,
  buildRenjaOpdOfficialDocx,
  buildRenjaOpdOfficialPdf,
  buildRkpdOfficialDocx,
  buildRkpdOfficialPdf,
};
