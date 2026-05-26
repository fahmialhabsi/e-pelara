const reportQueryService = require("./mrPlanningReportQueryService");

const SEVERITY = {
  BLOCKING: "blocking",
  WARNING: "warning",
  INFO: "info",
};

const CODES = {
  PEDOMAN_1_CONTEXT_SOURCE_MISSING: "PEDOMAN_1_CONTEXT_SOURCE_MISSING",
  PEDOMAN_4_RISK_CATEGORY_MISSING: "PEDOMAN_4_RISK_CATEGORY_MISSING",
  PEDOMAN_5_ANALYSIS_MISSING: "PEDOMAN_5_ANALYSIS_MISSING",
  PEDOMAN_8_ROOT_CAUSE_MISSING: "PEDOMAN_8_ROOT_CAUSE_MISSING",
  PEDOMAN_10_MONITORING_MISSING: "PEDOMAN_10_MONITORING_MISSING",
  PEDOMAN_15_EFFECTIVENESS_UNRATED: "PEDOMAN_15_EFFECTIVENESS_UNRATED",
  RESIDUAL_GATE_NOT_EVALUATED: "RESIDUAL_GATE_NOT_EVALUATED",
};

const FINDING_CATALOG = [
  // Prioritas prefix lebih spesifik dulu agar tidak tertangkap prefix umum.
  { prefix: "Pedoman No 15", code: CODES.PEDOMAN_15_EFFECTIVENESS_UNRATED },
  { prefix: "Pedoman No 10", code: CODES.PEDOMAN_10_MONITORING_MISSING },
  { prefix: "Pedoman No 8", code: CODES.PEDOMAN_8_ROOT_CAUSE_MISSING },
  { prefix: "Pedoman No 5", code: CODES.PEDOMAN_5_ANALYSIS_MISSING },
  { prefix: "Pedoman No 4", code: CODES.PEDOMAN_4_RISK_CATEGORY_MISSING },
  { prefix: "Pedoman No 1", code: CODES.PEDOMAN_1_CONTEXT_SOURCE_MISSING },
];

const mapMessageToCode = (message = "") => {
  const text = String(message || "");
  const hit = FINDING_CATALOG.find((row) => text.includes(row.prefix));
  return hit?.code || "UNKNOWN_FINDING";
};

const extractKodeRisiko = (message = "") => {
  const text = String(message || "");
  const match = text.match(/MR-\d{4}-[A-Z_]+-\d{3}/i);
  return match ? match[0].toUpperCase() : null;
};

const extractCountFromMessage = (message = "") => {
  const text = String(message || "");
  const match = text.match(/Terdapat\s+(\d+)/i);
  return match ? Number(match[1]) : null;
};

const normalizeRecommendedAction = (code) => {
  switch (code) {
    case CODES.PEDOMAN_1_CONTEXT_SOURCE_MISSING:
      return "Lengkapi context item/sumber risiko pada context laporan.";
    case CODES.PEDOMAN_4_RISK_CATEGORY_MISSING:
      return "Lengkapi kategori risiko lalu verifikasi + approve revisi.";
    case CODES.PEDOMAN_5_ANALYSIS_MISSING:
      return "Lengkapi analisis risiko (kemungkinan + dampak) untuk risiko terkait.";
    case CODES.PEDOMAN_8_ROOT_CAUSE_MISSING:
      return "Lengkapi root cause/penyebab risiko untuk risiko terkait.";
    case CODES.PEDOMAN_10_MONITORING_MISSING:
      return "Lengkapi monitoring untuk RTP aktif yang belum dipantau.";
    case CODES.PEDOMAN_15_EFFECTIVENESS_UNRATED:
      return "Lengkapi data efektivitas pengendalian pada monitoring terkait.";
    case CODES.RESIDUAL_GATE_NOT_EVALUATED:
      return "Pastikan residual risk pada risiko prioritas sudah dievaluasi.";
    default:
      return "Tindaklanjuti temuan sesuai detail blocker pada report quality gate.";
  }
};

const scanContextIntegrity = async (contextId, options = {}) => {
  const report = await reportQueryService.getFullReport(contextId, {
    flow: options.flow || "integrity_scan",
    snapshot_mode: options.snapshot_mode || "detect_only",
    user_id: options.user_id || null,
    source_endpoint: options.source_endpoint || null,
    request_id: options.request_id || null,
    idempotency_key: options.idempotency_key || null,
  });

  const qualityGate = report?.report_quality_gate || {};
  const pedomanIssues = Array.isArray(qualityGate.pedoman_blocking_issues)
    ? qualityGate.pedoman_blocking_issues
    : [];
  const finalBlockers = Array.isArray(qualityGate.final_report_blocking_issues)
    ? qualityGate.final_report_blocking_issues
    : [];

  const findings = [];

  for (const item of pedomanIssues) {
    const code = mapMessageToCode(item);
    const kodeRisiko = extractKodeRisiko(item);
    findings.push({
      code,
      severity: SEVERITY.BLOCKING,
      message: item,
      context_id: Number(contextId),
      risk_id: null,
      kode_risiko: kodeRisiko,
      issue_count: extractCountFromMessage(item),
      source_section: "report_quality_gate.pedoman_blocking_issues",
      suggested_fix: normalizeRecommendedAction(code),
    });
  }

  for (const item of finalBlockers) {
    findings.push({
      code: CODES.RESIDUAL_GATE_NOT_EVALUATED,
      severity: SEVERITY.BLOCKING,
      message: item,
      context_id: Number(contextId),
      risk_id: null,
      kode_risiko: null,
      issue_count: extractCountFromMessage(item),
      source_section: "report_quality_gate.final_report_blocking_issues",
      suggested_fix: normalizeRecommendedAction(CODES.RESIDUAL_GATE_NOT_EVALUATED),
    });
  }

  const dedupe = new Set();
  const normalizedFindings = findings.filter((f) => {
    const key = `${f.code}|${f.message}|${f.source_section}`;
    if (dedupe.has(key)) return false;
    dedupe.add(key);
    return true;
  });

  const recommendedActionSet = new Set();
  normalizedFindings.forEach((f) => {
    recommendedActionSet.add(normalizeRecommendedAction(f.code));
  });

  const blockingCount = normalizedFindings.filter(
    (f) => f.severity === SEVERITY.BLOCKING
  ).length;
  const warningCount = normalizedFindings.filter(
    (f) => f.severity === SEVERITY.WARNING
  ).length;

  const overallStatus =
    blockingCount > 0
      ? "merah"
      : warningCount > 0
      ? "kuning"
      : "hijau";

  // audit log ringan detect-only (tanpa mutasi data bisnis)
  console.info("[MR_INTEGRITY_SCAN]", {
    context_id: Number(contextId),
    overall_status: overallStatus,
    blocking_count: blockingCount,
    warning_count: warningCount,
    request_id: options.request_id || null,
    source_endpoint: options.source_endpoint || null,
    scanned_at: new Date().toISOString(),
  });

  return {
    context_id: Number(contextId),
    overall_status: overallStatus,
    blocking_count: blockingCount,
    warning_count: warningCount,
    final_report_status: qualityGate?.final_report_status || null,
    findings: normalizedFindings,
    recommended_actions: Array.from(recommendedActionSet),
    scan_meta: {
      mode: "detect_only",
      scanned_at: new Date().toISOString(),
      source: "mr_integrity_scan_service",
    },
  };
};

module.exports = {
  scanContextIntegrity,
  CODES,
  SEVERITY,
};
