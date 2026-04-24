"use strict";

const { Op } = require("sequelize");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const {
  IndikatorSasaran,
  Sasaran,
  IndikatorProgram,
  IndikatorKegiatan,
  Program,
  OpdPenanggungJawab,
} = require("../models");

const CACHE_TTL_MS = 5 * 60 * 1000;
const monitoringCache = new Map();

function cacheKey(periodeId, sasaranId) {
  return `${periodeId}:${sasaranId == null || sasaranId === "" ? "all" : String(sasaranId)}`;
}

function pruneCache() {
  const now = Date.now();
  for (const [k, v] of monitoringCache) {
    if (v.expiresAt <= now) monitoringCache.delete(k);
  }
}

function parseNum(v) {
  if (v === undefined || v === null) return null;
  let s = String(v).trim().replace(/\s/g, "");
  if (!s) return null;
  const lc = s.lastIndexOf(",");
  const ld = s.lastIndexOf(".");
  if (lc !== -1 && lc > ld) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function targetsAndCapaian(row) {
  const target = [];
  const capaian = [];
  for (let i = 1; i <= 5; i += 1) {
    target.push(parseNum(row[`target_tahun_${i}`]));
    capaian.push(parseNum(row[`capaian_tahun_${i}`]));
  }
  const deviasi = target.map((t, idx) => {
    const c = capaian[idx];
    if (t === null || c === null) return null;
    return Number((c - t).toFixed(4));
  });
  return { target, capaian, deviasi };
}

function yearRatios(target, capaian) {
  const ratios = [];
  for (let i = 0; i < 5; i += 1) {
    const t = target[i];
    const c = capaian[i];
    if (t === null || c === null || t <= 0) continue;
    ratios.push(c / t);
  }
  return ratios;
}

function statusFromRatios(ratios) {
  if (!ratios.length) return { key: "abu", label: "N/A", minRatio: null };
  const minR = Math.min(...ratios);
  /** Hijau ≥100%, kuning 80–99%, merah di bawah 80% (min rasio cap/target per tahun valid). */
  if (minR >= 1) return { key: "hijau", label: "Hijau", minRatio: minR };
  if (minR >= 0.8) return { key: "kuning", label: "Kuning", minRatio: minR };
  return { key: "merah", label: "Merah", minRatio: minR };
}

function statusKeyFromSingleYearRatio(ratio) {
  if (ratio == null || !Number.isFinite(ratio)) return "abu";
  if (ratio >= 1) return "hijau";
  if (ratio >= 0.8) return "kuning";
  return "merah";
}

/** Progress capaian vs target (rata-rata rasio th yang valid), 0–100 untuk UI */
function progressPct(target, capaian) {
  const ratios = yearRatios(target, capaian);
  if (!ratios.length) return null;
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return Math.min(100, Math.max(0, Math.round(avg * 1000) / 10));
}

/**
 * Ambil data monitoring (tanpa cache).
 */
async function fetchMonitoringData(periodeId, query = {}) {
  const pid = parseInt(String(periodeId), 10);
  if (!Number.isFinite(pid) || pid < 1) {
    const e = new Error("periodeId tidak valid.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const sasaranId = query.sasaranId != null ? parseInt(String(query.sasaranId), 10) : null;

  const whereInd = { periode_id: pid };
  if (Number.isFinite(sasaranId) && sasaranId > 0) {
    whereInd.sasaran_id = sasaranId;
  }

  const rows = await IndikatorSasaran.findAll({
    where: whereInd,
    order: [
      ["sasaran_id", "ASC"],
      ["kode_indikator", "ASC"],
    ],
  });

  const sasIds = [...new Set(rows.map((r) => r.get("sasaran_id")).filter((x) => x != null))];
  const sasaranRows =
    sasIds.length > 0
      ? await Sasaran.findAll({
          where: { id: { [Op.in]: sasIds }, periode_id: pid },
          attributes: ["id", "isi_sasaran", "nomor"],
          raw: true,
        })
      : [];
  const sasById = new Map(sasaranRows.map((s) => [s.id, s]));

  const bySasaran = new Map();
  for (const r of rows) {
    const plain = r.get({ plain: true });
    const sid = plain.sasaran_id;
    const srow = sasById.get(sid);
    const sname =
      srow?.isi_sasaran ||
      [srow?.nomor, srow?.isi_sasaran].filter(Boolean).join(" — ") ||
      `Sasaran #${sid}`;
    if (!bySasaran.has(sid)) {
      bySasaran.set(sid, { sasaran_id: sid, sasaran_nama: sname, indikator: [] });
    }
    const { target, capaian, deviasi } = targetsAndCapaian(plain);
    const ratios = yearRatios(target, capaian);
    const st = statusFromRatios(ratios);
    bySasaran.get(sid).indikator.push({
      id: plain.id,
      nama: plain.nama_indikator,
      kode: plain.kode_indikator,
      satuan: plain.satuan || "%",
      target,
      capaian,
      deviasi,
      status: st.label,
      status_key: st.key,
      capaian_pct_min: st.minRatio != null ? Math.round(st.minRatio * 1000) / 10 : null,
      progress_pct: progressPct(target, capaian),
    });
  }

  const sasaran = Array.from(bySasaran.values());
  let totalInd = 0;
  const allRatios = [];
  let tercapai = 0;
  let tidakTercapai = 0;
  for (const s of sasaran) {
    for (const ind of s.indikator) {
      totalInd += 1;
      const rs = yearRatios(ind.target, ind.capaian);
      for (const x of rs) allRatios.push(x);
      if (ind.status_key === "hijau") tercapai += 1;
      if (ind.status_key === "merah") tidakTercapai += 1;
    }
  }
  const avgCapPct =
    allRatios.length > 0
      ? Math.round((allRatios.reduce((a, b) => a + b, 0) / allRatios.length) * 1000) / 10
      : null;

  return {
    sasaran,
    summary: {
      total_indikator: totalInd,
      rata_rata_capaian_pct: avgCapPct,
      jumlah_tercapai: tercapai,
      jumlah_tidak_tercapai: tidakTercapai,
    },
  };
}

/**
 * Cache memori 5 menit untuk GET monitoring (key periode + filter sasaran).
 */
async function getIndikatorMonitoring(periodeId, query = {}) {
  const pid = parseInt(String(periodeId), 10);
  const sasQ = query.sasaranId != null && String(query.sasaranId).trim() !== "" ? String(query.sasaranId) : "";
  const bust = query.refresh === true || query.refresh === "true" || query.refresh === "1";

  pruneCache();
  const key = cacheKey(pid, sasQ);
  if (bust) monitoringCache.delete(key);
  if (!bust) {
    const hit = monitoringCache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return { ...hit.data, _cached: true };
    }
  }

  const data = await fetchMonitoringData(periodeId, query);
  monitoringCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return { ...data, _cached: false };
}

function invalidateMonitoringCacheForPeriode(periodeId) {
  const p = String(periodeId);
  for (const k of monitoringCache.keys()) {
    if (k.startsWith(`${p}:`)) monitoringCache.delete(k);
  }
}

/**
 * Drill-down: program & kegiatan yang merujuk indikator sasaran (sasaran_id di program = id indikator sasaran).
 */
async function getIndikatorDrilldown(periodeId, indikatorSasaranId) {
  const pid = parseInt(String(periodeId), 10);
  const iid = parseInt(String(indikatorSasaranId), 10);
  if (!Number.isFinite(pid) || !Number.isFinite(iid)) {
    const e = new Error("Parameter tidak valid.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const ind = await IndikatorSasaran.findOne({ where: { id: iid, periode_id: pid } });
  if (!ind) {
    const e = new Error("Indikator sasaran tidak ditemukan.");
    e.code = "NOT_FOUND";
    throw e;
  }
  const plain = ind.get({ plain: true });
  const { target, capaian, deviasi } = targetsAndCapaian(plain);
  const ratios = yearRatios(target, capaian);
  const st = statusFromRatios(ratios);

  const programs = await IndikatorProgram.findAll({
    where: { sasaran_id: iid },
    include: [{ model: Program, as: "program", attributes: ["id", "nama_program", "kode_program"], required: false }],
    order: [["kode_indikator", "ASC"]],
  });
  const progIds = programs.map((p) => p.id);
  const kegiatans =
    progIds.length > 0
      ? await IndikatorKegiatan.findAll({
          where: { indikator_program_id: { [Op.in]: progIds } },
          order: [["kode_indikator", "ASC"]],
        })
      : [];

  return {
    indikator_sasaran: {
      id: plain.id,
      kode: plain.kode_indikator,
      nama: plain.nama_indikator,
      satuan: plain.satuan,
      target,
      capaian,
      deviasi,
      status: st.label,
      status_key: st.key,
    },
    program: programs.map((p) => {
      const pl = p.get({ plain: true });
      const tc = targetsAndCapaian(pl);
      return {
        id: pl.id,
        kode_indikator: pl.kode_indikator,
        nama_indikator: pl.nama_indikator,
        program_id: pl.program_id,
        nama_program: pl.program?.nama_program || null,
        kode_program: pl.program?.kode_program || null,
        target: tc.target,
        capaian: tc.capaian,
        deviasi: tc.deviasi,
      };
    }),
    kegiatan: kegiatans.map((k) => {
      const kl = k.get({ plain: true });
      const tc = targetsAndCapaian(kl);
      return {
        id: kl.id,
        indikator_program_id: kl.indikator_program_id,
        kode_indikator: kl.kode_indikator,
        nama_indikator: kl.nama_indikator,
        target: tc.target,
        capaian: tc.capaian,
      };
    }),
  };
}

function flatRowsForExport(data) {
  const rows = [];
  for (const s of data.sasaran || []) {
    for (const ind of s.indikator || []) {
      rows.push({
        Sasaran: s.sasaran_nama,
        Kode: ind.kode,
        Indikator: ind.nama,
        T1: ind.target?.[0] ?? "",
        T2: ind.target?.[1] ?? "",
        T3: ind.target?.[2] ?? "",
        T4: ind.target?.[3] ?? "",
        T5: ind.target?.[4] ?? "",
        C1: ind.capaian?.[0] ?? "",
        C2: ind.capaian?.[1] ?? "",
        C3: ind.capaian?.[2] ?? "",
        C4: ind.capaian?.[3] ?? "",
        C5: ind.capaian?.[4] ?? "",
        Status: ind.status,
      });
    }
  }
  return rows;
}

async function buildExportBuffer(periodeId, format, query = {}) {
  const data = await fetchMonitoringData(periodeId, query);
  const fmt = String(format || "excel").toLowerCase();
  if (fmt === "pdf") {
    return buildPdfBuffer(data, periodeId);
  }
  return buildExcelBuffer(data);
}

function buildExcelBuffer(data) {
  const rows = flatRowsForExport(data);
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: "Tidak ada data" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Monitoring");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return { buffer: buf, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx" };
}

function buildPdfBuffer(data, periodeId) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => {
      resolve({
        buffer: Buffer.concat(chunks),
        mime: "application/pdf",
        ext: "pdf",
      });
    });
    doc.on("error", reject);

    doc.fontSize(14).text(`Monitoring Indikator RPJMD — Periode ID ${periodeId}`, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(
      `Total: ${data.summary?.total_indikator ?? 0} | Tercapai: ${data.summary?.jumlah_tercapai ?? 0} | Tidak tercapai: ${data.summary?.jumlah_tidak_tercapai ?? 0} | Rata-rata cap/target: ${data.summary?.rata_rata_capaian_pct ?? "—"}%`,
    );
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(8).text("Sasaran | Kode | Indikator | Status", { continued: false });
    doc.moveDown(0.35);
    doc.font("Helvetica").fontSize(8);
    for (const s of data.sasaran || []) {
      for (const ind of s.indikator || []) {
        const line = `${String(s.sasaran_nama || "").slice(0, 42)} | ${ind.kode || ""} | ${String(ind.nama || "").slice(0, 48)} | ${ind.status || ""}`;
        doc.text(line, { width: doc.page.width - 80 });
        doc.moveDown(0.2);
        if (doc.y > doc.page.height - 80) doc.addPage();
      }
    }
    doc.end();
  });
}

/**
 * Baris indikator sasaran + OPD penanggung jawab + status (satu query).
 */
async function loadIndikatorRowsWithOpd(periodeId) {
  const pid = parseInt(String(periodeId), 10);
  if (!Number.isFinite(pid) || pid < 1) {
    const e = new Error("periodeId tidak valid.");
    e.code = "BAD_REQUEST";
    throw e;
  }

  const rows = await IndikatorSasaran.findAll({
    where: { periode_id: pid },
    include: [
      {
        model: OpdPenanggungJawab,
        as: "opdPenanggungJawab",
        attributes: ["id", "nama_opd", "nama"],
        required: false,
      },
    ],
    order: [
      ["sasaran_id", "ASC"],
      ["kode_indikator", "ASC"],
    ],
  });

  const sasIds = [...new Set(rows.map((r) => r.get("sasaran_id")).filter((x) => x != null))];
  const sasaranRows =
    sasIds.length > 0
      ? await Sasaran.findAll({
          where: { id: { [Op.in]: sasIds }, periode_id: pid },
          attributes: ["id", "isi_sasaran", "nomor"],
          raw: true,
        })
      : [];
  const sasById = new Map(sasaranRows.map((s) => [s.id, s]));

  return rows.map((r) => {
    const plain = r.get({ plain: true });
    const sid = plain.sasaran_id;
    const srow = sasById.get(sid);
    const sasaran_nama =
      srow?.isi_sasaran ||
      [srow?.nomor, srow?.isi_sasaran].filter(Boolean).join(" — ") ||
      (sid != null ? `Sasaran #${sid}` : "—");

    const { target, capaian, deviasi } = targetsAndCapaian(plain);
    const ratios = yearRatios(target, capaian);
    const st = statusFromRatios(ratios);
    const opdRow = plain.opdPenanggungJawab;
    const opd_nama = (opdRow && (opdRow.nama_opd || opdRow.nama)) || "Tanpa OPD";
    const opd_id = plain.penanggung_jawab != null ? plain.penanggung_jawab : null;

    const tahun_cells = [];
    for (let i = 0; i < 5; i += 1) {
      const t = target[i];
      const c = capaian[i];
      if (t === null || c === null || t <= 0) {
        tahun_cells.push({ tahun: i + 1, status_key: "abu", ratio_pct: null });
      } else {
        const ratio = c / t;
        tahun_cells.push({
          tahun: i + 1,
          status_key: statusKeyFromSingleYearRatio(ratio),
          ratio_pct: Math.round(ratio * 1000) / 10,
        });
      }
    }

    return {
      id: plain.id,
      sasaran_id: sid,
      sasaran_nama,
      kode: plain.kode_indikator,
      nama: plain.nama_indikator,
      opd_id,
      opd_nama,
      target,
      capaian,
      deviasi,
      status_key: st.key,
      status_label: st.label,
      progress_pct: progressPct(target, capaian),
      min_ratio_pct: st.minRatio != null ? Math.round(st.minRatio * 1000) / 10 : null,
      tahun_cells,
    };
  });
}

/** Dashboard capaian per OPD: agregat + detail per indikator. */
async function getMonitoringByOpd(periodeId) {
  const flat = await loadIndikatorRowsWithOpd(periodeId);
  const byOpd = new Map();

  for (const row of flat) {
    const key = row.opd_id == null ? "__none__" : String(row.opd_id);
    if (!byOpd.has(key)) {
      byOpd.set(key, {
        opd_id: row.opd_id,
        opd_nama: row.opd_nama,
        indikator_total: 0,
        hijau: 0,
        kuning: 0,
        merah: 0,
        abu: 0,
        sum_progress: 0,
        n_progress: 0,
        indikator: [],
      });
    }
    const g = byOpd.get(key);
    g.indikator_total += 1;
    if (row.status_key === "hijau") g.hijau += 1;
    else if (row.status_key === "kuning") g.kuning += 1;
    else if (row.status_key === "merah") g.merah += 1;
    else g.abu += 1;
    if (row.progress_pct != null) {
      g.sum_progress += row.progress_pct;
      g.n_progress += 1;
    }
    g.indikator.push({
      id: row.id,
      kode: row.kode,
      nama: row.nama,
      sasaran_nama: row.sasaran_nama,
      status_key: row.status_key,
      status_label: row.status_label,
      progress_pct: row.progress_pct,
      min_ratio_pct: row.min_ratio_pct,
    });
  }

  const opd_list = Array.from(byOpd.values()).map((g) => ({
    opd_id: g.opd_id,
    opd_nama: g.opd_nama,
    indikator_total: g.indikator_total,
    hijau: g.hijau,
    kuning: g.kuning,
    merah: g.merah,
    abu: g.abu,
    rata_rata_progress_pct:
      g.n_progress > 0 ? Math.round((g.sum_progress / g.n_progress) * 10) / 10 : null,
    indikator: g.indikator,
  }));

  opd_list.sort((a, b) => {
    const pa = a.rata_rata_progress_pct;
    const pb = b.rata_rata_progress_pct;
    if (pa == null && pb == null) return a.opd_nama.localeCompare(b.opd_nama);
    if (pa == null) return 1;
    if (pb == null) return -1;
    return pb - pa;
  });

  let total = 0;
  let t_hijau = 0;
  let t_kuning = 0;
  let t_merah = 0;
  for (const row of flat) {
    total += 1;
    if (row.status_key === "hijau") t_hijau += 1;
    else if (row.status_key === "kuning") t_kuning += 1;
    else if (row.status_key === "merah") t_merah += 1;
  }

  return {
    summary: {
      total_indikator: total,
      jumlah_opd: opd_list.length,
      jumlah_hijau: t_hijau,
      jumlah_kuning: t_kuning,
      jumlah_merah: t_merah,
    },
    opd: opd_list,
  };
}

/** Heatmap: per indikator × tahun (warna per sel dari cap/target tahun itu). */
async function getMonitoringHeatmap(periodeId) {
  const flat = await loadIndikatorRowsWithOpd(periodeId);
  const rows = flat.map((row) => ({
    id: row.id,
    kode: row.kode,
    nama: row.nama,
    sasaran_nama: row.sasaran_nama,
    opd_nama: row.opd_nama,
    status_key: row.status_key,
    tahun: row.tahun_cells,
  }));
  return {
    columns: [1, 2, 3, 4, 5].map((t) => ({ tahun: t, label: `Th ${t}` })),
    rows,
  };
}

/** Early warning: ringkasan + daftar indikator merah (dan kuning untuk konteks). */
async function getMonitoringAlerts(periodeId) {
  const flat = await loadIndikatorRowsWithOpd(periodeId);
  let merah = 0;
  let kuning = 0;
  const indikator_merah = [];
  const indikator_kuning = [];
  for (const row of flat) {
    if (row.status_key === "merah") {
      merah += 1;
      indikator_merah.push({
        id: row.id,
        kode: row.kode,
        nama: row.nama,
        sasaran_nama: row.sasaran_nama,
        opd_nama: row.opd_nama,
        progress_pct: row.progress_pct,
        min_ratio_pct: row.min_ratio_pct,
      });
    } else if (row.status_key === "kuning") {
      kuning += 1;
      indikator_kuning.push({
        id: row.id,
        kode: row.kode,
        nama: row.nama,
        sasaran_nama: row.sasaran_nama,
        opd_nama: row.opd_nama,
        progress_pct: row.progress_pct,
        min_ratio_pct: row.min_ratio_pct,
      });
    }
  }
  return {
    summary: {
      total_indikator: flat.length,
      jumlah_merah: merah,
      jumlah_kuning: kuning,
      perlu_perhatian: merah + kuning,
    },
    indikator_merah,
    indikator_kuning,
  };
}

module.exports = {
  getIndikatorMonitoring,
  fetchMonitoringData,
  getIndikatorDrilldown,
  buildExportBuffer,
  invalidateMonitoringCacheForPeriode,
  CACHE_TTL_MS,
  getMonitoringByOpd,
  getMonitoringHeatmap,
  getMonitoringAlerts,
};
