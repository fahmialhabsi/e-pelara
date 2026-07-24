"use strict";

const { CODES, scanContextIntegrity } = require("./mrIntegrityScanService");
const mrPlanningMonitoringService = require("./mrPlanningMonitoringService");
const mrPlanningRiskAnalysisService = require("./mrPlanningRiskAnalysisService");
const mrPlanningRootCauseService = require("./mrPlanningRootCauseService");

const ALLOWED_FINDING_CODES = new Set([
  CODES.PEDOMAN_1_CONTEXT_SOURCE_MISSING,
  CODES.PEDOMAN_4_RISK_CATEGORY_MISSING,
  CODES.PEDOMAN_5_ANALYSIS_MISSING,
  CODES.PEDOMAN_8_ROOT_CAUSE_MISSING,
  CODES.PEDOMAN_10_MONITORING_MISSING,
  CODES.PEDOMAN_15_EFFECTIVENESS_UNRATED,
  CODES.RESIDUAL_GATE_NOT_EVALUATED,
]);

const REPAIRABLE_CODES = new Set([
  // fase aktivasi awal mutasi aman:
  // hanya PEDOMAN_10 dengan membuat draft monitoring dari risk
  // menggunakan service bisnis existing (bukan SQL liar).
  CODES.PEDOMAN_10_MONITORING_MISSING,
  // aktivasi tahap berikut:
  // PEDOMAN_5 dengan membuat draft risk analysis jika belum ada.
  CODES.PEDOMAN_5_ANALYSIS_MISSING,
  // aktivasi tahap berikut:
  // PEDOMAN_8 dengan membuat draft root cause jika belum ada.
  CODES.PEDOMAN_8_ROOT_CAUSE_MISSING,
]);

function throwValidation(message, details = null) {
  const err = new Error(message);
  err.status = 422;
  err.statusCode = 422;
  err.code = "MR_REPAIR_DRAFT_VALIDATION_ERROR";
  err.details = details;
  throw err;
}

function normalizeCodes(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throwValidation("finding_codes wajib diisi minimal 1 item.");
  }

  const uniq = new Set();
  input.forEach((x) => {
    const code = String(x || "").trim().toUpperCase();
    if (!code) return;
    if (!ALLOWED_FINDING_CODES.has(code)) {
      throwValidation("Ditemukan finding code yang tidak diizinkan.", { invalid_code: code });
    }
    uniq.add(code);
  });

  const codes = Array.from(uniq);
  if (codes.length === 0) {
    throwValidation("finding_codes tidak valid.");
  }
  return codes;
}

const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== "";

async function repairDraftFromFindings(contextId, payload = {}, options = {}) {
  const safeContextId = Number(contextId);
  if (!safeContextId) {
    throwValidation("contextId tidak valid.");
  }

  const repairMode = String(payload?.repair_mode || "").toLowerCase();
  if (repairMode !== "draft_only") {
    throwValidation("repair_mode wajib draft_only.");
  }
  if (payload?.confirm !== true) {
    throwValidation("confirm wajib true.");
  }

  const findingCodes = normalizeCodes(payload?.finding_codes);

  const scan = await scanContextIntegrity(safeContextId, {
    flow: "repair_draft_precheck",
    snapshot_mode: "detect_only",
    user_id: options.user_id || null,
    source_endpoint: options.source_endpoint || null,
    request_id: options.request_id || null,
    idempotency_key: options.idempotency_key || null,
  });

  const findings = Array.isArray(scan?.findings) ? scan.findings : [];
  const findingsByCode = new Map();
  findings.forEach((f) => {
    const code = String(f?.code || "").toUpperCase();
    if (!code) return;
    if (!findingsByCode.has(code)) findingsByCode.set(code, []);
    findingsByCode.get(code).push(f);
  });

  const skipped_reasons = [];
  let repaired_count = 0;
  let skipped_count = 0;

  for (const code of findingCodes) {
    const related = findingsByCode.get(code) || [];
    if (related.length === 0) {
      skipped_count += 1;
      skipped_reasons.push(`Code ${code} tidak ditemukan pada integrity scan terbaru untuk context ${safeContextId}.`);
      continue;
    }

    if (!REPAIRABLE_CODES.has(code)) {
      skipped_count += related.length;
      skipped_reasons.push(
        `Code ${code} belum diaktifkan untuk auto-repair aman. Lakukan perbaikan manual melalui modul sumber.`,
      );
      continue;
    }

    if (code === CODES.PEDOMAN_10_MONITORING_MISSING) {
      for (const finding of related) {
        const refs = Array.isArray(finding?.risk_refs) ? finding.risk_refs : [];
        if (refs.length === 0) {
          skipped_count += 1;
          skipped_reasons.push(
            `Code ${code} tidak memiliki risk_refs untuk diproses otomatis.`,
          );
          continue;
        }

        for (const ref of refs) {
          const riskId = Number(ref?.risk_id || 0);
          if (!riskId) {
            skipped_count += 1;
            skipped_reasons.push(`Code ${code} memiliki risk_id tidak valid.`);
            continue;
          }

          try {
            const existing = await mrPlanningMonitoringService.getMonitoringsByRisk(riskId);
            if (Array.isArray(existing) && existing.length > 0) {
              skipped_count += 1;
              skipped_reasons.push(
                `Risk ID ${riskId} sudah memiliki monitoring, auto-repair dilewati.`,
              );
              continue;
            }

            const preview = await mrPlanningMonitoringService.buildDraftPreviewFromRisk({
              riskId,
              body: {},
            });
            const draftBody = preview?.data || {};
            await mrPlanningMonitoringService.createMonitoringFromRisk({
              riskId,
              body: draftBody,
              userId: options.user_id || null,
            });
            repaired_count += 1;
          } catch (err) {
            skipped_count += 1;
            skipped_reasons.push(
              `Risk ID ${riskId} gagal dibuatkan draft monitoring: ${err?.message || "unknown_error"}`,
            );
          }
        }
      }
      continue;
    }

    if (code === CODES.PEDOMAN_5_ANALYSIS_MISSING) {
      for (const finding of related) {
        const refs = Array.isArray(finding?.risk_refs) ? finding.risk_refs : [];
        if (refs.length === 0) {
          skipped_count += 1;
          skipped_reasons.push(
            `Code ${code} tidak memiliki risk_refs untuk diproses otomatis.`,
          );
          continue;
        }

        for (const ref of refs) {
          const riskId = Number(ref?.risk_id || 0);
          if (!riskId) {
            skipped_count += 1;
            skipped_reasons.push(`Code ${code} memiliki risk_id tidak valid.`);
            continue;
          }

          try {
            const existing = await mrPlanningRiskAnalysisService.getAnalysesByRisk(riskId);
            if (Array.isArray(existing) && existing.length > 0) {
              const analysis = existing[0];
              const isDraft = String(analysis?.status_revisi || "").toLowerCase() === "draft";
              if (!isDraft) {
                skipped_count += 1;
                skipped_reasons.push(
                  `Risk ID ${riskId} memiliki risk analysis non-draft, auto-repair dilewati.`,
                );
                continue;
              }

              // Repair aman untuk Pedoman 5:
              // jika baris analysis sudah ada tapi field turunan kosong,
              // paksa re-hit updateDraftAnalysis agar label/reference & matrix dihitung ulang.
              const needsRecompute =
                !hasValue(analysis?.existing_control_status) ||
                !hasValue(analysis?.control_adequacy_status) ||
                !hasValue(analysis?.inherent_level) ||
                !hasValue(analysis?.residual_level);

              if (!needsRecompute) {
                skipped_count += 1;
                skipped_reasons.push(
                  `Risk ID ${riskId} sudah memiliki risk analysis, auto-repair dilewati.`,
                );
                continue;
              }

              await mrPlanningRiskAnalysisService.updateDraftAnalysis({
                analysisId: analysis.id,
                body: {
                  alasan_revisi:
                    "Auto-repair Pedoman 5: normalisasi field analisis turunan yang belum terisi.",
                },
                userId: options.user_id || null,
              });
              repaired_count += 1;
              continue;
            }

            await mrPlanningRiskAnalysisService.createAnalysisFromRisk({
              riskId,
              body: {},
              userId: options.user_id || null,
            });
            repaired_count += 1;
          } catch (err) {
            skipped_count += 1;
            skipped_reasons.push(
              `Risk ID ${riskId} gagal dibuatkan draft analysis: ${err?.message || "unknown_error"}`,
            );
          }
        }
      }
      continue;
    }

    if (code === CODES.PEDOMAN_8_ROOT_CAUSE_MISSING) {
      for (const finding of related) {
        const refs = Array.isArray(finding?.risk_refs) ? finding.risk_refs : [];
        if (refs.length === 0) {
          skipped_count += 1;
          skipped_reasons.push(
            `Code ${code} tidak memiliki risk_refs untuk diproses otomatis.`,
          );
          continue;
        }

        for (const ref of refs) {
          const riskId = Number(ref?.risk_id || 0);
          if (!riskId) {
            skipped_count += 1;
            skipped_reasons.push(`Code ${code} memiliki risk_id tidak valid.`);
            continue;
          }

          try {
            const existing = await mrPlanningRootCauseService.getRootCausesByRisk(riskId);
            if (Array.isArray(existing) && existing.length > 0) {
              const rootCause = existing[0];
              const isDraft = String(rootCause?.status_revisi || "").toLowerCase() === "draft";
              if (!isDraft) {
                skipped_count += 1;
                skipped_reasons.push(
                  `Risk ID ${riskId} memiliki root cause non-draft, auto-repair dilewati.`,
                );
                continue;
              }

              // Sama seperti PEDOMAN_5: root cause SUDAH ADA tapi
              // uraian_penyebab/akar_penyebab masih kosong (dibuat sebelum
              // fix applyRootCauseDefaultsFromRisk) — paksa re-hit
              // updateDraftRootCause agar diisi ulang dari penyebab_risiko.
              const needsRecompute =
                !hasValue(rootCause?.uraian_penyebab) || !hasValue(rootCause?.akar_penyebab);

              if (!needsRecompute) {
                skipped_count += 1;
                skipped_reasons.push(
                  `Risk ID ${riskId} sudah memiliki root cause lengkap, auto-repair dilewati.`,
                );
                continue;
              }

              await mrPlanningRootCauseService.updateDraftRootCause({
                rootCauseId: rootCause.id,
                body: {
                  alasan_revisi:
                    "Auto-repair Pedoman 8: normalisasi field root cause turunan yang belum terisi.",
                },
                userId: options.user_id || null,
              });
              repaired_count += 1;
              continue;
            }

            await mrPlanningRootCauseService.createRootCauseFromRisk({
              riskId,
              body: {},
              userId: options.user_id || null,
            });
            repaired_count += 1;
          } catch (err) {
            skipped_count += 1;
            skipped_reasons.push(
              `Risk ID ${riskId} gagal dibuatkan draft root cause: ${err?.message || "unknown_error"}`,
            );
          }
        }
      }
      continue;
    }

    skipped_count += related.length;
    skipped_reasons.push(`Code ${code} belum diaktifkan untuk auto-repair aman. Lakukan perbaikan manual melalui modul sumber.`);
  }

  const postScan = await scanContextIntegrity(safeContextId, {
    flow: "repair_draft_postcheck",
    snapshot_mode: "detect_only",
    user_id: options.user_id || null,
    source_endpoint: options.source_endpoint || null,
    request_id: options.request_id || null,
    idempotency_key: options.idempotency_key || null,
  });

  return {
    context_id: safeContextId,
    repaired_count,
    skipped_count,
    skipped_reasons,
    requested_codes: findingCodes,
    remaining_findings: postScan?.findings || [],
    final_report_status: postScan?.final_report_status || null,
    audit_ref: {
      action: "REPAIR_DRAFT_FROM_FINDINGS",
      mode: "draft_only",
      request_id: options.request_id || null,
      idempotency_key: options.idempotency_key || null,
    },
  };
}

module.exports = {
  repairDraftFromFindings,
};
