"use strict";

const fs = require("fs");
const path = require("path");
const { QueryTypes } = require("sequelize");
const puppeteer = require("puppeteer");
const { buildDocumentHtml } = require("./lkPdfRenderService");
const { validasiSebelumGenerate } = require("./lkPdfValidationService");

const STORAGE_DIR = path.join(__dirname, "..", "storage", "lk-pdf");

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function defaultVariabel(tahunAnggaran, overrides = {}) {
  const d = new Date();
  const bulanTahun = `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
  return {
    NAMA_OPD: "Dinas Pangan Provinsi Maluku Utara",
    TAHUN: String(tahunAnggaran),
    TAHUN_LALU: String(tahunAnggaran - 1),
    KOTA: "Sofifi",
    BULAN_TAHUN: bulanTahun,
    KEPALA_OPD: "Dheni Tjan, SH., M.Si",
    NIP_KEPALA_OPD: "19750730 200112 1 001",
    JABATAN_KEPALA_OPD: "Kepala Dinas Pangan Provinsi Maluku Utara",
    ...overrides,
  };
}

function num(v) {
  return Number(v) || 0;
}

async function loadPdfPayload(sequelize, db, tahunAnggaran) {
  const { LakSnapshot, NeracaSnapshot, LoSnapshot, LpeSnapshot, CalkTemplate, CalkKonten } = db;

  const lraRows = await sequelize.query(
    `SELECT ls.*, kab.jenis AS kelompok
     FROM lra_snapshot ls
     LEFT JOIN kode_akun_bas kab ON kab.kode = ls.kode_akun
     WHERE ls.tahun_anggaran = :tahun
     ORDER BY
       CASE kab.jenis
         WHEN 'PENDAPATAN' THEN 1
         WHEN 'BELANJA' THEN 2
         WHEN 'PEMBIAYAAN' THEN 3
         ELSE 9
       END,
       ls.kode_akun`,
    { replacements: { tahun: tahunAnggaran }, type: QueryTypes.SELECT },
  );

  const neracaRows = await NeracaSnapshot.findAll({
    where: { tahun_anggaran: tahunAnggaran },
    order: [
      ["kelompok", "ASC"],
      ["urutan", "ASC"],
      ["kode_akun", "ASC"],
    ],
    raw: true,
  });

  const loRows = await LoSnapshot.findAll({
    where: { tahun_anggaran: tahunAnggaran },
    order: [
      ["kelompok", "ASC"],
      ["urutan", "ASC"],
    ],
    raw: true,
  });

  const lpeRows = await LpeSnapshot.findAll({
    where: { tahun_anggaran: tahunAnggaran },
    order: [["urutan", "ASC"]],
    raw: true,
  });

  const lakRows = await LakSnapshot.findAll({
    where: { tahun_anggaran: tahunAnggaran },
    order: [
      ["kelompok", "ASC"],
      ["urutan", "ASC"],
    ],
    raw: true,
  });

  const calkTemplates = await CalkTemplate.findAll({ order: [["urutan", "ASC"]] });
  const kontenRows = await CalkKonten.findAll({ where: { tahun_anggaran: tahunAnggaran } });
  const kMap = new Map(kontenRows.map((k) => [k.template_id, k]));

  const calkBab = calkTemplates.map((template) => ({
    template: template.get({ plain: true }),
    konten: kMap.get(template.id) ? kMap.get(template.id).get({ plain: true }) : null,
  }));

  let pendapatan = 0;
  let belanja = 0;
  for (const r of lraRows) {
    if (r.kelompok === "PENDAPATAN") pendapatan += num(r.realisasi);
    if (r.kelompok === "BELANJA") belanja += num(r.realisasi);
  }

  let aset = 0;
  let kewajiban = 0;
  let ekuitas = 0;
  for (const r of neracaRows) {
    if (r.kelompok === "ASET") aset += num(r.nilai_tahun_ini);
    if (r.kelompok === "KEWAJIBAN") kewajiban += num(r.nilai_tahun_ini);
    if (r.kode_akun === "3.1") ekuitas = num(r.nilai_tahun_ini);
  }

  let pLo = 0;
  let bLo = 0;
  for (const r of loRows) {
    if (r.kelompok === "PENDAPATAN_LO") pLo += num(r.nilai_tahun_ini);
    if (r.kelompok === "BEBAN_LO") bLo += num(r.nilai_tahun_ini);
  }
  const surplusLo = pLo - bLo;

  const ringkasan = {
    pendapatan,
    belanja,
    aset,
    kewajiban,
    ekuitas,
    surplus_lo: surplusLo,
  };

  return {
    lraRows,
    neracaRows,
    loRows,
    lpeRows,
    lakRows,
    calkTemplates: calkTemplates.map((t) => t.get({ plain: true })),
    calkBab,
    ringkasan,
  };
}

async function buildHtmlForTahun(sequelize, db, tahunAnggaran, options = {}) {
  const data = await loadPdfPayload(sequelize, db, tahunAnggaran);
  const variabel = defaultVariabel(tahunAnggaran, options.variabelOverride || {});
  return buildDocumentHtml(data, variabel);
}

/**
 * Generate PDF LK lengkap. Wajib lolos validasiSebelumGenerate (panggil dari controller).
 */
async function generateLkPdfBuffer(htmlString) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlString, { waitUntil: "networkidle0", timeout: 120000 });

    const footerTemplate = `<div style="width:100%; font-size:8pt; padding:0 36px; display:flex; justify-content:space-between; font-family:Arial,sans-serif;">
      <span>Catatan atas Laporan Keuangan merupakan bagian yang tidak terpisahkan dari Laporan Keuangan ini</span>
      <span>Hal. <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`;

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate,
      margin: { top: "72px", bottom: "64px", left: "54px", right: "48px" },
    });
    return pdfBuffer;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function generateLkPdfSimpan(sequelize, db, tahunAnggaran, user, options = {}) {
  const validation = await validasiSebelumGenerate(sequelize, db, tahunAnggaran);
  if (!validation.valid) {
    const err = new Error("Validasi gagal — PDF tidak dibuat");
    err.statusCode = 400;
    err.validation = validation;
    throw err;
  }

  const html = await buildHtmlForTahun(sequelize, db, tahunAnggaran, options);
  let pdfBuffer;
  try {
    pdfBuffer = await generateLkPdfBuffer(html);
  } catch (e) {
    const err = new Error(
      `Puppeteer gagal membuat PDF: ${e.message}. Pastikan Chrome/Chromium tersedia di server produksi.`,
    );
    err.statusCode = 503;
    err.cause = e;
    throw err;
  }

  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  const filename = `LK-${tahunAnggaran}-${Date.now()}.pdf`;
  const filepath = path.join(STORAGE_DIR, filename);
  fs.writeFileSync(filepath, pdfBuffer);

  const { LkPdfRiwayat } = db;
  const row = await LkPdfRiwayat.create({
    tahun_anggaran: tahunAnggaran,
    filename,
    filepath: path.relative(path.join(__dirname, ".."), filepath).replace(/\\/g, "/"),
    size_bytes: pdfBuffer.length,
    user_id: user?.id || null,
    username: user?.username || null,
  });

  return {
    validation,
    filename,
    filepath,
    size: pdfBuffer.length,
    id: row.id,
    riwayat: row.get({ plain: true }),
  };
}

module.exports = {
  generateLkPdfBuffer,
  generateLkPdfSimpan,
  buildHtmlForTahun,
  loadPdfPayload,
  defaultVariabel,
  STORAGE_DIR,
};
