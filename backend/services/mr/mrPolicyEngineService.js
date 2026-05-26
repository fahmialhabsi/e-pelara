"use strict";
const EXCEPTION = require("../../constants/mrExceptionCodes");
function assertFinalReportNotOverwrite(report = {}) {
  if (report.is_final && !report.is_correction_mode) {
    throw { code: "MR_POLICY_VIOLATION", message: "Final report tidak boleh ditimpa. Gunakan correction/addendum workflow." };
  }
}
function assertResidualRiskEvaluated(riskData = {}) {
  if (!riskData.residual_risk_evaluated) {
    throw { code: "MR_POLICY_VIOLATION", message: "Residual risk belum dievaluasi." };
  }
}
function assertSnapshotExists(snapshotId) {
  if (!snapshotId) {
    throw { code: EXCEPTION.EXCEPTION_SNAPSHOT_ID_MISSING, message: "Snapshot belum dibuat." };
  }
}
function assertReportExportPolicy({
  report = {},
  format = "unknown",
} = {}) {
  const gate = report?.report_quality_gate || report?.quality_gate || {};
  const approvalGate = report?.report_approval_gate || {};
  const finalStatus = String(gate?.final_report_status || "").toLowerCase();
  const readyToSign = approvalGate?.ready_to_sign === true;

  if (["pdf", "docx", "word", "excel_final", "xlsx_final"].includes(String(format).toLowerCase())) {
    if (!readyToSign || (finalStatus && finalStatus !== "ready_for_pdf" && finalStatus !== "ready")) {
      throw {
        status: 422,
        statusCode: 422,
        code: "MR_POLICY_EXPORT_NOT_READY",
        message: "Export final belum memenuhi policy readiness. Dokumen hanya boleh dipakai sebagai draft/review.",
      };
    }
  }
}
function assertReportReadinessForFinalFlow({
  report = {},
  flow = "report",
} = {}) {
  const normalizedFlow = String(flow || "").toLowerCase();
  const guardedFlows = ["final_export", "correction", "addendum", "export_word", "export_pdf"];
  if (!guardedFlows.includes(normalizedFlow)) return;

  const gate = report?.report_quality_gate || report?.quality_gate || {};
  const approvalGate = report?.report_approval_gate || {};
  const finalStatus = String(gate?.final_report_status || "").toLowerCase();
  const readyToSign = approvalGate?.ready_to_sign === true;

  if (!readyToSign || (finalStatus && finalStatus !== "ready_for_pdf" && finalStatus !== "ready")) {
    throw {
      status: 422,
      statusCode: 422,
      code: "MR_POLICY_REPORT_NOT_READY",
      message:
        "Flow final/correction belum memenuhi policy readiness. Selesaikan approval dan quality gate sebelum finalisasi.",
    };
  }
}
module.exports = { assertFinalReportNotOverwrite, assertResidualRiskEvaluated, assertSnapshotExists, assertReportExportPolicy, assertReportReadinessForFinalFlow, EXCEPTIONS: EXCEPTION };
