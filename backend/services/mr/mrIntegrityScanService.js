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

const getFindingUxMeta = (code) => {
  switch (code) {
    case CODES.PEDOMAN_1_CONTEXT_SOURCE_MISSING:
      return {
        user_title: "Sumber risiko belum lengkap",
        user_message:
          "Data konteks/sumber risiko pada laporan ini belum lengkap dan perlu dilengkapi.",
        target_module: "mr_planning_context",
        target_route: "/mr/planning-context",
      };
    case CODES.PEDOMAN_4_RISK_CATEGORY_MISSING:
      return {
        user_title: "Kategori risiko belum lengkap",
        user_message:
          "Sebagian risiko belum memiliki kategori risiko. Lengkapi kategori sebelum finalisasi.",
        target_module: "mr_planning_risk",
        target_route: "/mr/planning-risk",
      };
    case CODES.PEDOMAN_5_ANALYSIS_MISSING:
      return {
        user_title: "Analisis risiko belum lengkap",
        user_message:
          "Analisis kemungkinan/dampak/residual pada risiko terkait belum lengkap.",
        target_module: "mr_planning_risk",
        target_route: "/mr/planning-risk",
      };
    case CODES.PEDOMAN_8_ROOT_CAUSE_MISSING:
      return {
        user_title: "Root cause belum lengkap",
        user_message:
          "Akar penyebab risiko (root cause) pada risiko prioritas belum lengkap.",
        target_module: "mr_planning_risk",
        target_route: "/mr/planning-risk",
      };
    case CODES.PEDOMAN_10_MONITORING_MISSING:
      return {
        user_title: "Monitoring RTP belum lengkap",
        user_message:
          "Masih ada RTP aktif yang belum memiliki data monitoring dalam cakupan laporan.",
        target_module: "mr_planning_risk",
        target_route: "/mr/planning-risk",
      };
    case CODES.PEDOMAN_15_EFFECTIVENESS_UNRATED:
      return {
        user_title: "Efektivitas pengendalian belum dinilai",
        user_message:
          "Penilaian efektivitas pengendalian pada monitoring terkait belum lengkap.",
        target_module: "mr_planning_risk",
        target_route: "/mr/planning-risk",
      };
    case CODES.RESIDUAL_GATE_NOT_EVALUATED:
      return {
        user_title: "Evaluasi residual risk belum lengkap",
        user_message:
          "Residual risk pada risiko prioritas belum dievaluasi sehingga finalisasi belum diizinkan.",
        target_module: "mr_planning_risk",
        target_route: "/mr/planning-risk",
      };
    default:
      return {
        user_title: "Temuan governance perlu ditindaklanjuti",
        user_message:
          "Masih ada temuan yang harus diperbaiki sebelum proses review/finalisasi.",
        target_module: "mr_planning_report",
        target_route: "/mr/planning-report",
      };
  }
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeRiskRefs = (rows = []) => {
  const dedupe = new Set();
  const result = [];
  toArray(rows).forEach((row) => {
    const riskId =
      row?.risk_id ??
      row?.mr_planning_risk_id ??
      row?.id_risiko ??
      row?.id ??
      null;
    const kodeRisiko = row?.kode_risiko || null;
    if (!riskId && !kodeRisiko) return;
    const key = `${riskId || ""}|${kodeRisiko || ""}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    result.push({ risk_id: riskId ? Number(riskId) : null, kode_risiko: kodeRisiko });
  });
  return result;
};

const collectRiskRefsByCode = (report = {}) => {
  const lampiran = report?.lampiran || {};
  const refs = {
    [CODES.PEDOMAN_4_RISK_CATEGORY_MISSING]: [],
    [CODES.PEDOMAN_5_ANALYSIS_MISSING]: [],
    [CODES.PEDOMAN_8_ROOT_CAUSE_MISSING]: [],
    [CODES.PEDOMAN_10_MONITORING_MISSING]: [],
    [CODES.PEDOMAN_15_EFFECTIVENESS_UNRATED]: [],
    [CODES.RESIDUAL_GATE_NOT_EVALUATED]: [],
  };

  refs[CODES.PEDOMAN_4_RISK_CATEGORY_MISSING] = normalizeRiskRefs(lampiran?.daftar_risiko);
  refs[CODES.PEDOMAN_5_ANALYSIS_MISSING] = normalizeRiskRefs(lampiran?.risiko_prioritas);
  refs[CODES.PEDOMAN_8_ROOT_CAUSE_MISSING] = normalizeRiskRefs(lampiran?.risiko_prioritas);
  refs[CODES.PEDOMAN_10_MONITORING_MISSING] = normalizeRiskRefs(lampiran?.rencana_pengendalian);
  refs[CODES.PEDOMAN_15_EFFECTIVENESS_UNRATED] = normalizeRiskRefs(lampiran?.realisasi_pengendalian);
  refs[CODES.RESIDUAL_GATE_NOT_EVALUATED] = normalizeRiskRefs(lampiran?.risiko_prioritas);

  return refs;
};

const hasContextSourceData = (report = {}) => {
  const contextItemsTop = toArray(report?.context_items);
  const contextItemsNested = toArray(report?.context?.items);
  const pedomanContextRows = toArray(
    report?.lampiran?.generated_sections?.pedoman_no_1_penetapan_konteks?.rows
  );
  const lampiranDaftarRisikoRows = toArray(report?.lampiran?.daftar_risiko);

  return (
    contextItemsTop.length > 0 ||
    contextItemsNested.length > 0 ||
    pedomanContextRows.length > 0 ||
    lampiranDaftarRisikoRows.length > 0
  );
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
  const riskRefsByCode = collectRiskRefsByCode(report);

  const findings = [];

  for (const item of pedomanIssues) {
    const code = mapMessageToCode(item);
    const uxMeta = getFindingUxMeta(code);
    if (
      code === CODES.PEDOMAN_1_CONTEXT_SOURCE_MISSING &&
      hasContextSourceData(report)
    ) {
      // suppress false blocker Pedoman 1 saat context aktif faktual sudah punya sumber/item
      continue;
    }
    const kodeRisiko = extractKodeRisiko(item);
    findings.push({
      code,
      severity: SEVERITY.BLOCKING,
      message: item,
      context_id: Number(contextId),
      risk_id: riskRefsByCode[code]?.[0]?.risk_id || null,
      kode_risiko: kodeRisiko || riskRefsByCode[code]?.[0]?.kode_risiko || null,
      risk_refs: riskRefsByCode[code] || [],
      issue_count: extractCountFromMessage(item),
      source_section: "report_quality_gate.pedoman_blocking_issues",
      suggested_fix: normalizeRecommendedAction(code),
      user_title: uxMeta.user_title,
      user_message: uxMeta.user_message,
      target_module: uxMeta.target_module,
      target_route: uxMeta.target_route,
      technical_detail: {
        raw_message: item,
        source_section: "report_quality_gate.pedoman_blocking_issues",
      },
    });
  }

  for (const item of finalBlockers) {
    const code = CODES.RESIDUAL_GATE_NOT_EVALUATED;
    const uxMeta = getFindingUxMeta(code);
    findings.push({
      code,
      severity: SEVERITY.BLOCKING,
      message: item,
      context_id: Number(contextId),
      risk_id:
        riskRefsByCode[CODES.RESIDUAL_GATE_NOT_EVALUATED]?.[0]?.risk_id || null,
      kode_risiko:
        riskRefsByCode[CODES.RESIDUAL_GATE_NOT_EVALUATED]?.[0]?.kode_risiko || null,
      risk_refs: riskRefsByCode[CODES.RESIDUAL_GATE_NOT_EVALUATED] || [],
      issue_count: extractCountFromMessage(item),
      source_section: "report_quality_gate.final_report_blocking_issues",
      suggested_fix: normalizeRecommendedAction(code),
      user_title: uxMeta.user_title,
      user_message: uxMeta.user_message,
      target_module: uxMeta.target_module,
      target_route: uxMeta.target_route,
      technical_detail: {
        raw_message: item,
        source_section: "report_quality_gate.final_report_blocking_issues",
      },
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
