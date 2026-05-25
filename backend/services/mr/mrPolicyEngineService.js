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
module.exports = { assertFinalReportNotOverwrite, assertResidualRiskEvaluated, assertSnapshotExists, EXCEPTIONS: EXCEPTION };