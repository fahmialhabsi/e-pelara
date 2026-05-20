import api from "../../../services/api";
import {
  extractListData,
  extractListResponse,
  extractSingleData,
} from "../../../utils/apiResponse";
import {
  getProvisionAction,
  getStage,
  getTargetRefId,
  isMissingTarget,
  isProvisionable,
  normalizeGovernanceResult,
} from "../audit/utils/governanceFlowAdapter";

const normalizePayload = (payload = {}) => {
  const clone = { ...payload };
  Object.keys(clone).forEach((key) => {
    if (clone[key] === undefined) delete clone[key];
    if (clone[key] === "") clone[key] = null;
  });
  return clone;
};

const normalizeGovernanceParams = (params = {}) => {
  const clone = { ...params };

  Object.keys(clone).forEach((key) => {
    if (clone[key] === undefined || clone[key] === null || clone[key] === "") {
      delete clone[key];
    }
  });

  return clone;
};

const normalizeRenstraProgramParams = (params = {}) => {
  const clone = { ...params };

  Object.keys(clone).forEach((key) => {
    if (clone[key] === undefined || clone[key] === null || clone[key] === "") {
      delete clone[key];
    }
  });

  return clone;
};

const assertRequiredGovernanceParams = (params, keys) => {
  const missing = keys.filter((key) => {
    const value = params[key];
    if (key === "renstra_id" || key === "source_ref_id" || key === "rpjmd_id") {
      const num = Number(value);
      return !Number.isFinite(num) || num <= 0;
    }

    return value === undefined || value === null || String(value).trim() === "";
  });

  if (missing.length > 0) {
    const error = new Error(`Parameter Governance Hub wajib diisi: ${missing.join(", ")}`);
    error.code = "GOVERNANCE_HUB_PARAMS_INVALID";
    error.missingFields = missing;
    throw error;
  }
};

const extractGovernanceResponse = (responseOrError) =>
  normalizeGovernanceResult(responseOrError);

const requestGovernanceResponse = async (requestFn) => {
  try {
    const response = await requestFn();
    return extractGovernanceResponse(response);
  } catch (error) {
    return extractGovernanceResponse(error);
  }
};

const GOVERNANCE_BLOCKING_CODES = new Set([
  "missing_target",
  "chain_mismatch",
  "resolver_conflict",
  "blocked",
  "indicator_context_invalid",
  "dropdown_scope_violation",
  "target_scope_violation",
  "parent_missing",
  "source_map_invalid",
  "parent_indicator_not_found",
  "parent_chain_invalid",
  "need_super_admin_confirmation",
  "indicator_hierarchy_ambiguous",
  "target_sub_kegiatan_not_found",
  "target_sub_kegiatan_code_mismatch",
  "target_sub_kegiatan_parent_mismatch",
  "target_sub_kegiatan_duplicate",
  "source_sub_kegiatan_not_found",
  "parent_kegiatan_mapping_invalid",
]);

const GOVERNANCE_UI_MESSAGES = {
  missing_target:
    "Mapping target Renstra untuk data RPJMD ini belum tersedia atau belum valid. Silakan jalankan sinkronisasi Governance Hub atau pilih data lain.",
  chain_mismatch:
    "Rantai keterhubungan RPJMD–Renstra tidak valid. Silakan periksa mapping parent-child pada Governance Hub.",
  resolver_conflict:
    "Resolver menemukan lebih dari satu kemungkinan target Renstra. Silakan periksa source map Governance Hub sebelum melanjutkan.",
  blocked:
    "Data tidak dapat dilanjutkan karena masih diblokir oleh guard Governance Hub. Silakan selesaikan status blocking terlebih dahulu.",
  indicator_context_invalid:
    "Konteks indikator Renstra tidak lengkap atau tidak valid. Silakan pilih target Renstra yang sesuai.",
  dropdown_scope_violation:
    "Scope dropdown Renstra tidak valid. Silakan pilih parent target yang sesuai.",
  target_scope_violation:
    "Target Renstra yang dipilih tidak sesuai dengan scope yang dibutuhkan.",
  parent_missing:
    "Parent target Renstra belum tersedia. Silakan pilih parent yang valid atau jalankan sinkronisasi Governance Hub.",
  source_map_invalid:
    "Source-map Governance Hub belum valid untuk indikator ini.",
  parent_indicator_not_found:
    "Parent indikator belum ditemukan. Jalankan health scan atau repair yang aman terlebih dahulu.",
  parent_chain_invalid:
    "Parent chain indikator belum valid. Periksa hirarki kode indikator sebelum melanjutkan.",
  need_super_admin_confirmation:
    "Sistem menemukan kandidat indikator, tetapi confidence belum cukup untuk auto-repair aman.",
  indicator_hierarchy_ambiguous:
    "Sistem menemukan lebih dari satu kandidat relasi indikator. Perlu konfirmasi Super Admin.",
  target_sub_kegiatan_not_found:
    "Target Renstra Sub Kegiatan dengan kode yang sama belum ditemukan pada parent Kegiatan Renstra yang valid. Silakan sinkronkan struktur Sub Kegiatan melalui alur resmi, lalu ulangi uji keterhubungan.",
  target_sub_kegiatan_code_mismatch:
    "Kode Sub Kegiatan Renstra berbeda dengan kode sumber RPJMD. Kandidat tersebut ditolak.",
  target_sub_kegiatan_parent_mismatch:
    "Parent Kegiatan Renstra belum cocok untuk Sub Kegiatan ini. Kandidat tersebut ditolak.",
  target_sub_kegiatan_duplicate:
    "Sistem menemukan lebih dari satu target Sub Kegiatan dengan kode yang sama. Perlu konfirmasi Super Admin.",
  source_sub_kegiatan_not_found:
    "Source Sub Kegiatan RPJMD tidak ditemukan.",
  parent_kegiatan_mapping_invalid:
    "Target parent Kegiatan Renstra belum valid. Sinkronkan Kegiatan terlebih dahulu.",
};

const normalizeGovernanceText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const extractGovernanceInput = (input) => {
  if (!input) return {};
  if (input?.response) {
    return input.response?.data ?? input.data ?? {};
  }

  return input?.data && typeof input.data === "object" ? input.data : input;
};

const normalizeGovernanceCode = (value) => {
  const text = normalizeGovernanceText(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return text;
};

export const getGovernanceBlockingCode = (input = null) => {
  const payload = extractGovernanceInput(input);
  const candidates = [
    input?.code,
    input?.status,
    payload?.code,
    payload?.status,
    payload?.diagnosis_status,
    payload?.classification,
    payload?.mapping_status,
    payload?.chain_status,
  ];

  for (const candidate of candidates) {
    const code = normalizeGovernanceCode(candidate);
    if (GOVERNANCE_BLOCKING_CODES.has(code)) {
      return code;
    }
  }

  return "";
};

export const isGovernanceBlocked = (input = null) => {
  const payload = extractGovernanceInput(input);
  const code = getGovernanceBlockingCode(input);

  return (
    GOVERNANCE_BLOCKING_CODES.has(code) ||
    payload?.success === false ||
    Boolean(payload?.error) ||
    Boolean(payload?.dropdown_safe === false) ||
    Boolean(payload?.can_use_for_indicator === false)
  );
};

export const getGovernanceBlockingMessage = (input = null) => {
  const payload = extractGovernanceInput(input);
  return normalizeGovernanceText(
    payload?.dropdown_block_reason ||
      payload?.block_reason ||
      payload?.message ||
      payload?.error ||
      input?.message ||
      "",
  );
};

export const getSubKegiatanTargetProvisionStatus = (input = null) => {
  const normalized = normalizeGovernanceResult(input);
  const payload = extractGovernanceInput(normalized);
  const sourceStage = normalizeGovernanceText(
    getStage(normalized) ||
      payload?.source_stage ||
      payload?.sourceStage ||
      input?.source_stage ||
      "",
  ).toLowerCase();

  if (sourceStage === "sub_kegiatan" && isMissingTarget(normalized) && !getTargetRefId(normalized)) {
    return {
      status: "TARGET_SUB_KEGIATAN_NOT_FOUND",
      provisionable: Boolean(isProvisionable(normalized)),
      provision_action: getProvisionAction(normalized) || "sub_kegiatan_target_provision",
    };
  }

  return {
    status: String(
      payload?.diagnosis_status ||
        normalized?.code ||
        input?.diagnosis_status ||
        input?.code ||
        "",
    )
      .trim()
      .toUpperCase(),
    provisionable: Boolean(isProvisionable(normalized)),
    provision_action: getProvisionAction(normalized) || null,
  };
};

export const buildGovernanceUiMessage = (input = null, fallback = "") => {
  const payload = extractGovernanceInput(input);
  const code = getGovernanceBlockingCode(input);

  if (GOVERNANCE_UI_MESSAGES[code]) {
    return GOVERNANCE_UI_MESSAGES[code];
  }

  if (payload?.success === false) {
    return (
      getGovernanceBlockingMessage(input) ||
      fallback ||
      "Mapping target Renstra untuk data RPJMD ini belum tersedia atau belum valid."
    );
  }

  return (
    getGovernanceBlockingMessage(input) ||
    normalizeGovernanceText(input?.message) ||
    fallback ||
    "Mapping target Renstra untuk data RPJMD ini belum tersedia atau belum valid."
  );
};

export const getAllRenstraDocs = async (params = {}) => {
  const response = await api.get("/renstra-docs", { params });
  return extractListResponse(response.data);
};

export const getRenstraDocById = async (id) => {
  const response = await api.get(`/renstra-docs/${id}`);
  return extractSingleData(response.data);
};

export const getRenstraAudit = async (id) => {
  const response = await api.get(`/renstra-docs/${id}/audit`);
  return extractListData(response.data);
};

export const createRenstraDoc = async (payload) => {
  const response = await api.post("/renstra-docs", normalizePayload(payload));
  return extractSingleData(response.data);
};

export const updateRenstraDoc = async (id, payload) => {
  const response = await api.put(`/renstra-docs/${id}`, normalizePayload(payload));
  return extractSingleData(response.data);
};

export const deleteRenstraDoc = async (id, body = {}) => {
  const response = await api.delete(`/renstra-docs/${id}`, {
    data: normalizePayload(body),
  });
  return response.data;
};

export const updateRenstraDocStatus = async (id, body) => {
  const payload = normalizePayload(body);
  if (payload.action) {
    const response = await api.post(
      `/renstra-docs/${id}/actions/${payload.action}`,
      payload,
    );
    return extractSingleData(response.data);
  }
  const response = await api.patch(`/renstra-docs/${id}/status`, payload);
  return extractSingleData(response.data);
};

export const syncRenstraDocs = async (params = {}) => {
  const response = await api.get("/renstra-docs/sync", { params });
  return response.data?.data || response.data;
};

export const getRenstraPrograms = async (params = {}) => {
  const query = normalizeRenstraProgramParams(params);
  const response = await api.get("/renstra-program", { params: query });

  return Array.isArray(response.data?.data)
    ? response.data.data
    : Array.isArray(response.data)
      ? response.data
      : [];
};

export const resolveRpjmdSourceMap = async (params = {}) => {
  const query = normalizeGovernanceParams(params);
  assertRequiredGovernanceParams(query, [
    "target_module",
    "renstra_id",
    "source_stage",
    "source_ref_id",
  ]);

  return requestGovernanceResponse(() =>
    api.get("/rpjmd-governance-sync/source-map", {
      params: query,
    }),
  );
};

export const getPreparedRpjmdSource = async (params = {}) => {
  const query = normalizeGovernanceParams(params);
  assertRequiredGovernanceParams(query, ["target_module", "renstra_id"]);

  return requestGovernanceResponse(() =>
    api.get("/rpjmd-governance-sync/prepared-source", {
      params: query,
    }),
  );
};

export const syncRpjmdIndicatorsToRenstra = async (payload = {}) => {
  const body = normalizeGovernanceParams(payload);
  assertRequiredGovernanceParams(body, [
    "rpjmd_id",
    "renstra_id",
    "target_module",
    "source_stage",
    "source_ref_id",
  ]);

  return requestGovernanceResponse(() =>
    api.post("/rpjmd-governance-sync/indicators/sync", body),
  );
};

export const getRpjmdIndicatorHealth = async (params = {}) => {
  const query = normalizeGovernanceParams(params);
  assertRequiredGovernanceParams(query, [
    "rpjmd_id",
    "renstra_id",
    "target_module",
    "source_stage",
    "source_ref_id",
  ]);

  return requestGovernanceResponse(() =>
    api.get("/rpjmd-governance-sync/indicator-health", {
      params: query,
    }),
  );
};

export const previewRpjmdIndicatorRepair = async (payload = {}) => {
  const body = normalizeGovernanceParams(payload);
  assertRequiredGovernanceParams(body, [
    "rpjmd_id",
    "renstra_id",
    "target_module",
    "source_stage",
    "source_ref_id",
  ]);

  return requestGovernanceResponse(() =>
    api.post("/rpjmd-governance-sync/indicator-repair/preview", body),
  );
};

export const executeRpjmdIndicatorRepair = async (payload = {}) => {
  const body = normalizeGovernanceParams(payload);
  assertRequiredGovernanceParams(body, [
    "rpjmd_id",
    "renstra_id",
    "target_module",
    "source_stage",
    "source_ref_id",
  ]);

  return requestGovernanceResponse(() =>
    api.post("/rpjmd-governance-sync/indicator-repair/execute", body),
  );
};

export const smartSyncRpjmdIndicatorsToRenstra = async (payload = {}) => {
  const body = normalizeGovernanceParams(payload);
  assertRequiredGovernanceParams(body, [
    "rpjmd_id",
    "renstra_id",
    "target_module",
    "source_stage",
    "source_ref_id",
  ]);

  return requestGovernanceResponse(() =>
    api.post("/rpjmd-governance-sync/indicators/smart-sync", body),
  );
};

export const provisionSubKegiatanRenstraTarget = async (payload = {}) => {
  const body = normalizeGovernanceParams(payload);
  assertRequiredGovernanceParams(body, [
    "rpjmd_id",
    "renstra_id",
    "target_module",
    "source_stage",
    "source_ref_id",
    "parent_source_stage",
    "parent_source_ref_id",
    "parent_target_ref_id",
  ]);

  return requestGovernanceResponse(() =>
    api.post("/rpjmd-governance-sync/sub-kegiatan/provision-target", body),
  );
};
