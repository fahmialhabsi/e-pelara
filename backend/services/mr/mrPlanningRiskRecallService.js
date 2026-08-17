"use strict";

/**
 * Recall MR Planning Risk dari Temuan (TLHP) sumbernya.
 *
 * escalateToRisk() (mrPlanningTemuanService.js) menyalin nama_risiko/
 * uraian_risiko/penyebab_risiko/dampak_risiko dari Temuan.judul_temuan/
 * uraian_temuan/sebab/akibat SATU KALI saat eskalasi. Kalau Temuan direvisi
 * lagi lewat createRevisionFromApprovedTemuan(), Risk itu ditandai
 * needs_recall (lihat mrPlanningTemuanService.js) — fungsi ini yang benar-benar
 * menarik ulang nilainya.
 *
 * Filosofi sama seperti renjaRecallService.segarkanNomenklatur(): field yang
 * sudah dijawab manusia sebagai keputusan register risiko (bukan sekadar
 * salinan mentah) HANYA disegarkan kalau Risk masih berstatus draft — reuse
 * updateDraftRisk() yang sudah punya guard ensureDraftEditable(). Kalau Risk
 * sudah verifikasi/approved/ditolak, hanya dilaporkan sebagai selisih (diff),
 * TIDAK ditimpa — user harus merevisi Risk-nya sendiri dulu (createRevisionFromApprovedRisk)
 * sebelum recall bisa menimpa.
 */

const { MrPlanningRisk, MrPlanningTemuan } = require("../../models");
const mrPlanningRiskService = require("./mrPlanningRiskService");

const FIELD_MAP = [
  { risk: "nama_risiko", temuan: "judul_temuan" },
  { risk: "uraian_risiko", temuan: "uraian_temuan" },
  { risk: "penyebab_risiko", temuan: "sebab" },
  { risk: "dampak_risiko", temuan: "akibat" },
];

async function recallRiskDariTemuan(riskId, { user = null } = {}) {
  const risk = await MrPlanningRisk.findByPk(riskId);
  if (!risk) {
    const err = new Error("MR Planning Risk tidak ditemukan.");
    err.statusCode = 404;
    throw err;
  }

  // Sprint 7 — S7R-009: recall menyentuh risk.update(...) langsung di dua
  // jalur (tidak-ada-selisih & sesudah delegasi ke updateDraftRisk), jadi
  // boundary check dipasang di sini, sebelum jalur mutasi manapun bercabang.
  const boundaryRecall = await mrPlanningRiskService.resolveMrPlanningRiskOpdBoundary({
    user,
    targetOpdId: risk?.opd_id ?? null,
  });
  if (!boundaryRecall.ok) {
    mrPlanningRiskService.throwMrPlanningRiskOpdBoundaryError(boundaryRecall);
  }

  const temuan = await MrPlanningTemuan.findOne({ where: { mr_planning_risk_id: riskId } });
  if (!temuan) {
    const err = new Error("Risk ini tidak berasal dari eskalasi Temuan TLHP — recall tidak berlaku.");
    err.statusCode = 400;
    throw err;
  }

  const diff = [];
  const freshFields = {};
  for (const { risk: riskField, temuan: temuanField } of FIELD_MAP) {
    const nilaiLama = risk[riskField] ?? null;
    const nilaiBaru = temuan[temuanField] ?? null;
    if (String(nilaiLama ?? "") !== String(nilaiBaru ?? "")) {
      diff.push({ field: riskField, lama: nilaiLama, baru: nilaiBaru });
      freshFields[riskField] = nilaiBaru;
    }
  }

  const laporan = {
    risk_id: risk.id,
    temuan_id: temuan.id,
    kode_temuan: temuan.kode_temuan,
    status_risiko_saat_ini: risk.status_revisi,
    selisih: diff,
    diterapkan: false,
  };

  if (!diff.length) {
    await risk.update({ needs_recall: false, recall_reason: null, last_recall_at: new Date() });
    laporan.pesan = "Tidak ada selisih — Risk sudah sesuai Temuan terbaru.";
    return laporan;
  }

  if (risk.status_revisi !== "draft") {
    laporan.pesan =
      `Ditemukan ${diff.length} field berbeda dari Temuan terbaru, tapi Risk berstatus ` +
      `"${risk.status_revisi}" (bukan draft) sehingga TIDAK ditimpa otomatis. ` +
      "Buat revisi Risk (createRevisionFromApprovedRisk) dulu, baru panggil recall ini lagi.";
    return laporan;
  }

  await mrPlanningRiskService.updateDraftRisk({
    riskId: risk.id,
    body: {
      ...freshFields,
      alasan_revisi: `Recall otomatis — disegarkan dari Temuan ${temuan.kode_temuan || temuan.id} yang direvisi.`,
    },
    user,
  });

  await risk.update({ needs_recall: false, recall_reason: null, last_recall_at: new Date() });

  laporan.diterapkan = true;
  laporan.pesan = `${diff.length} field disegarkan dari Temuan terbaru.`;
  return laporan;
}

module.exports = { recallRiskDariTemuan };
