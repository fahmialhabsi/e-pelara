"use strict";

const { resolveDropdownSourceMap } = require("./rpjmdSourceMapResolverService");

const VALID_TARGET_MODULE = "RENSTRA";
const VALID_PROVISION_ACTION = "sub_kegiatan_target_provision";

function safeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

function normalizeStage(value) {
  return normalizeText(value)?.toLowerCase() || null;
}

function getResolvedData(result = {}) {
  return result?.data && typeof result.data === "object" ? result.data : null;
}

function isSubKegiatanProvisionable(result = {}) {
  const data = getResolvedData(result) || {};
  const stage = normalizeStage(data.source_stage || result.source_stage);
  const diagnosisStatus = normalizeText(
    data.diagnosis_status || result.diagnosis_status || result.code,
  )?.toUpperCase() || null;
  const mappingStatus = normalizeStage(data.mapping_status || result.mapping_status);
  const provisionable = data.provisionable === true || result.provisionable === true;
  const provisionAction = normalizeText(
    data.provision_action || result.provision_action,
  );

  return Boolean(
    stage === "sub_kegiatan" &&
      provisionable &&
      (diagnosisStatus === "TARGET_SUB_KEGIATAN_NOT_FOUND" ||
        mappingStatus === "missing_target" ||
        provisionAction === VALID_PROVISION_ACTION),
  );
}

function getParentValid(result = {}) {
  const data = getResolvedData(result) || {};
  if (typeof data.parent_valid === "boolean") {
    return data.parent_valid;
  }

  const chainStatus = normalizeStage(data.chain_status || result.chain_status);
  return chainStatus === "valid" || chainStatus === "parent_valid_target_missing";
}

function normalizeFlowResult(result = {}, params = {}) {
  const data = getResolvedData(result) || {};
  const sourceStage = normalizeStage(
    data.source_stage || result.source_stage || params.source_stage,
  );
  const sourceRefId = safeNumber(
    data.source_ref_id ?? result.source_ref_id ?? params.source_ref_id,
  );
  const targetRefId = safeNumber(
    data.target_ref_id ?? result.target_ref_id ?? null,
  );
  const parentTargetRefId = safeNumber(
    data.parent_target_ref_id ?? result.parent_target_ref_id ?? null,
  );
  const parentSourceRefId = safeNumber(
    data.parent_source_ref_id ?? result.parent_source_ref_id ?? null,
  );
  const diagnosisStatus = normalizeText(
    data.diagnosis_status || result.diagnosis_status || result.code,
  )?.toUpperCase() || null;
  const mappingStatus = normalizeStage(data.mapping_status || result.mapping_status);
  const chainStatus = normalizeStage(data.chain_status || result.chain_status);
  const provisionable = isSubKegiatanProvisionable(result);
  const provisionAction =
    normalizeText(data.provision_action || result.provision_action) ||
    (provisionable ? VALID_PROVISION_ACTION : null);
  const parentValid = getParentValid(result);

  const normalizedData = {
    stage: sourceStage,
    source_stage: sourceStage,
    source_ref_id: sourceRefId,
    source_code: data.source_code ?? result.source_code ?? null,
    target_ref_id: targetRefId,
    target_code: data.target_code ?? result.target_code ?? null,
    mapping_status: mappingStatus,
    diagnosis_status: diagnosisStatus,
    chain_status: chainStatus,
    target_module: normalizeText(
      data.target_module || result.target_module || params.target_module,
    )?.toUpperCase() || VALID_TARGET_MODULE,
    rpjmd_id: safeNumber(data.rpjmd_id ?? result.rpjmd_id ?? params.rpjmd_id),
    renstra_id: safeNumber(data.renstra_id ?? result.renstra_id ?? params.renstra_id),
    parent_source_stage: normalizeStage(
      data.parent_source_stage || result.parent_source_stage,
    ),
    parent_source_ref_id: parentSourceRefId,
    parent_target_stage: normalizeStage(
      data.parent_target_stage || result.parent_target_stage,
    ),
    parent_target_ref_id: parentTargetRefId,
    parent_valid: parentValid,
    provisionable,
    provision_action: provisionAction,
  };

  return {
    success: result?.success !== undefined ? Boolean(result.success) : false,
    status:
      safeNumber(result?.status) ||
      safeNumber(result?.response?.status) ||
      (result?.success === false ? 400 : 200),
    code: normalizeText(result?.code || diagnosisStatus || null)?.toUpperCase() || null,
    message: normalizeText(result?.message || null) || "",
    errors: Array.isArray(result?.errors) ? result.errors : [],
    data: normalizedData,
    raw: result?.raw || null,
  };
}

async function resolveGovernanceFlow(params = {}) {
  const resolved = await resolveDropdownSourceMap(params);
  const normalized = normalizeFlowResult(resolved, params);

  if (!normalized.success && normalized.code === "RPJMD_SOURCE_MAP_NOT_FOUND") {
    normalized.data.provisionable = false;
    normalized.data.provision_action = null;
  }

  return normalized;
}

module.exports = {
  resolveGovernanceFlow,
  normalizeFlowResult,
  isSubKegiatanProvisionable,
};
