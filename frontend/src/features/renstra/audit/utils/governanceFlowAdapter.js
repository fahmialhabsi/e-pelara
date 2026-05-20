const VALID_TARGET_MODULE = "RENSTRA";
const VALID_PROVISION_ACTION = "sub_kegiatan_target_provision";

function normalizeGovernanceText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeGovernanceCode(value) {
  return normalizeGovernanceText(value)
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeGovernanceResult(responseOrError = null) {
  if (!responseOrError) {
    return {
      success: false,
      status: null,
      code: null,
      message: "",
      data: null,
      errors: [],
      raw: null,
    };
  }

  const isNormalizedPayload =
    responseOrError &&
    typeof responseOrError === "object" &&
    Object.prototype.hasOwnProperty.call(responseOrError, "success") &&
    Object.prototype.hasOwnProperty.call(responseOrError, "data");
  const axiosResponse = responseOrError?.response || null;
  const rawBody = isNormalizedPayload
    ? responseOrError
    : axiosResponse?.data ??
      (responseOrError?.config && responseOrError?.data !== undefined
        ? responseOrError.data
        : responseOrError);

  const payload =
    rawBody && typeof rawBody === "object" ? { ...rawBody } : { data: rawBody ?? null };
  const isLikelyError =
    responseOrError instanceof Error ||
    Boolean(responseOrError?.isAxiosError) ||
    Boolean(axiosResponse) ||
    Boolean(responseOrError?.response);
  const success =
    typeof payload.success === "boolean"
      ? payload.success
      : responseOrError?.success !== undefined
        ? Boolean(responseOrError.success)
        : !isLikelyError;
  const status =
    safeNumber(axiosResponse?.status) ||
    safeNumber(responseOrError?.status) ||
    safeNumber(payload.status) ||
    (success ? 200 : 400);
  const code = normalizeGovernanceCode(
    payload.code ||
      payload.diagnosis_status ||
      responseOrError?.code ||
      responseOrError?.diagnosis_status ||
      "",
  ) || null;
  const message = normalizeGovernanceText(
    payload.message || responseOrError?.message || "",
  );
  const errors = Array.isArray(payload.errors)
    ? payload.errors
    : Array.isArray(responseOrError?.errors)
      ? responseOrError.errors
      : [];

  return {
    ...payload,
    success,
    status,
    code,
    message,
    errors,
    raw: responseOrError,
  };
}

function getGovernancePayload(result = null) {
  const normalized = normalizeGovernanceResult(result);
  return normalized && normalized.data && typeof normalized.data === "object"
    ? normalized.data
    : {};
}

function getStage(result = null) {
  const payload = getGovernancePayload(result);
  return (
    normalizeGovernanceText(
      payload.stage || payload.source_stage || result?.stage || result?.source_stage || "",
    ).toLowerCase() || null
  );
}

function getSourceRefId(result = null) {
  const payload = getGovernancePayload(result);
  return safeNumber(payload.source_ref_id ?? result?.source_ref_id ?? null);
}

function getTargetRefId(result = null) {
  const payload = getGovernancePayload(result);
  return safeNumber(payload.target_ref_id ?? result?.target_ref_id ?? null);
}

function getProvisionTargetRefId(result = null) {
  const payload = getGovernancePayload(result);
  return safeNumber(
    payload.provision?.target_ref_id ??
      payload.source_map?.target_ref_id ??
      payload.target_ref_id ??
      result?.data?.provision?.target_ref_id ??
      result?.data?.source_map?.target_ref_id ??
      result?.target_ref_id ??
      null,
  );
}

function getParentTargetRefId(result = null) {
  const payload = getGovernancePayload(result);
  return safeNumber(
    payload.parent_target_ref_id ?? result?.parent_target_ref_id ?? null,
  );
}

function getProvisionAction(result = null) {
  const payload = getGovernancePayload(result);
  return (
    normalizeGovernanceText(
      payload.provision_action || result?.provision_action || "",
    ) || null
  );
}

function isMissingTarget(result = null) {
  const normalized = normalizeGovernanceResult(result);
  const payload = getGovernancePayload(normalized);
  const code = normalizeGovernanceCode(
    normalized.code ||
      payload.diagnosis_status ||
      payload.code ||
      result?.code ||
      result?.diagnosis_status ||
      "",
  );
  const mappingStatus = normalizeGovernanceCode(
    payload.mapping_status || result?.mapping_status || "",
  );

  return Boolean(
    code === "TARGET_SUB_KEGIATAN_NOT_FOUND" ||
      code === "RPJMD_SOURCE_MAP_MISSING_TARGET" ||
      mappingStatus === "MISSING_TARGET" ||
      (normalized.success === false &&
        getStage(normalized) === "sub_kegiatan" &&
        !getTargetRefId(normalized)),
  );
}

function isProvisionable(result = null) {
  const payload = getGovernancePayload(result);
  return Boolean(payload.provisionable || result?.provisionable);
}

function getCanonicalIndicatorQuery(result = null, activeState = {}) {
  const normalized = normalizeGovernanceResult(result);
  const payload = getGovernancePayload(normalized);

  return {
    renstra_id:
      safeNumber(activeState?.renstra_id) ??
      safeNumber(payload.renstra_id ?? normalized.renstra_id ?? null),
    stage:
      normalizeGovernanceText(
        activeState?.stage || activeState?.source_stage || getStage(normalized) || "sub_kegiatan",
      ).toLowerCase() || "sub_kegiatan",
    ref_id:
      safeNumber(activeState?.ref_id) ??
      safeNumber(activeState?.target_ref_id) ??
      getProvisionTargetRefId(normalized) ??
      safeNumber(payload?.canonical_indicator_query?.ref_id ?? null),
  };
}

function canRenderProvisionButton(result = null, userRole = null, parentState = {}) {
  const normalizedRole = normalizeGovernanceCode(userRole);
  const normalizedResult = normalizeGovernanceResult(result);
  const payload = getGovernancePayload(normalizedResult);
  const parentTargetRefId =
    getParentTargetRefId(normalizedResult) ??
    safeNumber(parentState?.parent_target_ref_id) ??
    safeNumber(parentState?.selectedKegiatanTargetId);
  const sourceRefId =
    getSourceRefId(normalizedResult) ?? safeNumber(parentState?.source_ref_id);
  const renstraId =
    safeNumber(payload.renstra_id ?? normalizedResult.renstra_id) ??
    safeNumber(parentState?.renstra_id);
  const rpjmdId =
    safeNumber(payload.rpjmd_id ?? normalizedResult.rpjmd_id) ??
    safeNumber(parentState?.rpjmd_id);
  const provisionAction = getProvisionAction(normalizedResult);

  return Boolean(
    normalizedRole === "SUPER_ADMIN" &&
      getStage(normalizedResult) === "sub_kegiatan" &&
      isMissingTarget(normalizedResult) &&
      isProvisionable(normalizedResult) &&
      provisionAction === VALID_PROVISION_ACTION &&
      parentTargetRefId &&
      sourceRefId &&
      renstraId &&
      rpjmdId,
  );
}

function buildProvisionPayload(result = null, activeState = {}) {
  const normalizedResult = normalizeGovernanceResult(result);
  const payload = getGovernancePayload(normalizedResult);
  const parentTargetRefId =
    getParentTargetRefId(normalizedResult) ??
    safeNumber(activeState?.parent_target_ref_id) ??
    safeNumber(activeState?.selectedKegiatanTargetId);

  return {
    rpjmd_id:
      safeNumber(activeState?.rpjmd_id) ??
      safeNumber(payload.rpjmd_id ?? normalizedResult.rpjmd_id ?? null),
    renstra_id:
      safeNumber(activeState?.renstra_id) ??
      safeNumber(payload.renstra_id ?? normalizedResult.renstra_id ?? null),
    target_module:
      normalizeGovernanceCode(
        activeState?.target_module || payload.target_module || VALID_TARGET_MODULE,
      ) || VALID_TARGET_MODULE,
    source_stage:
      normalizeGovernanceText(activeState?.source_stage || getStage(normalizedResult) || "")
        .toLowerCase() || "sub_kegiatan",
    source_ref_id:
      safeNumber(activeState?.source_ref_id) ??
      getSourceRefId(normalizedResult) ??
      null,
    parent_source_stage:
      normalizeGovernanceText(
        activeState?.parent_source_stage || payload.parent_source_stage || "kegiatan",
      ).toLowerCase() || "kegiatan",
    parent_source_ref_id:
      safeNumber(activeState?.parent_source_ref_id) ??
      safeNumber(payload.parent_source_ref_id ?? null),
    parent_target_ref_id: parentTargetRefId,
    run_smart_sync:
      activeState?.run_smart_sync !== undefined ? Boolean(activeState.run_smart_sync) : true,
    reason:
      normalizeGovernanceText(
        activeState?.reason || "Provision target Renstra Sub Kegiatan dari RPJMD source melalui alur resmi.",
      ),
  };
}

export {
  buildProvisionPayload,
  canRenderProvisionButton,
  getCanonicalIndicatorQuery,
  getParentTargetRefId,
  getProvisionTargetRefId,
  getProvisionAction,
  getStage,
  getTargetRefId,
  isMissingTarget,
  isProvisionable,
  normalizeGovernanceCode,
  normalizeGovernanceResult,
  normalizeGovernanceText,
};
