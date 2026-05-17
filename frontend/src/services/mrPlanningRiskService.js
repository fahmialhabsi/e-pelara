// frontend/src/services/mrPlanningRiskService.js

import api from "@/services/api";

const ENDPOINT = "/mr-planning-risk";
const CONTEXT_ENDPOINT = "/mr-planning-context";
const REFERENCE_ENDPOINT = "/mr-reference-items/group";

export const MR_PLANNING_RISK_QUERY_KEYS = {
  all: ["mr-planning-risk"],
  list: (params = {}) => ["mr-planning-risk", "list", params],
  detail: (id) => ["mr-planning-risk", "detail", String(id || "")],
  history: (id) => ["mr-planning-risk", "history", String(id || "")],
  historyDetail: (historyId) => [
    "mr-planning-risk",
    "history-detail",
    String(historyId || ""),
  ],
  contexts: (params = {}) => ["mr-planning-context", "list", params],
  contextDetail: (id) => ["mr-planning-context", "detail", String(id || "")],
  contextItems: (id) => ["mr-planning-context", "items", String(id || "")],
  referenceItems: (kodeGroup) => [
    "mr-reference-items",
    "group",
    String(kodeGroup || ""),
  ],
  proposalSources: () => [
    "mr-reference-items",
    "group",
    "MR_PROPOSAL_SOURCE",
  ],
};

const getResponseData = (response) => response?.data ?? null;

const getArrayData = (response) => {
  const data = getResponseData(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.result)) return data.result;

  return [];
};

const normalizeParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    })
  );

const buildDownloadConfig = (params = {}) => ({
  params: normalizeParams(params),
  responseType: "blob",
});

const buildExportUnavailableError = (error, format) => {
  const status = error?.response?.status;

  if (status === 404 || status === 405 || status === 501) {
    const message =
      `Endpoint export ${format.toUpperCase()} belum tersedia di backend. ` +
      "Tombol export boleh disiapkan sebagai future-ready, tetapi export final wajib dibuat melalui backend/export service resmi.";

    const normalizedError = new Error(message);
    normalizedError.isExportUnavailable = true;
    normalizedError.status = status;
    normalizedError.originalError = error;
    normalizedError.format = format;

    return normalizedError;
  }

  return error;
};

const requestExport = async ({ path, params, format }) => {
  try {
    const response = await api.get(path, buildDownloadConfig(params));
    return response;
  } catch (error) {
    throw buildExportUnavailableError(error, format);
  }
};

const mrPlanningRiskService = {
  ENDPOINT,
  CONTEXT_ENDPOINT,
  REFERENCE_ENDPOINT,

  async getContexts(params = {}) {
    const response = await api.get(CONTEXT_ENDPOINT, {
      params: normalizeParams(params),
    });

    return getResponseData(response);
  },

  async getContextById(id, params = {}) {
    if (!id) throw new Error("ID MR Planning Context wajib diisi.");

    const response = await api.get(`${CONTEXT_ENDPOINT}/${id}`, {
      params: normalizeParams(params),
    });

    return getResponseData(response);
  },

  async getContextItems(id) {
    if (!id) throw new Error("ID MR Planning Context wajib diisi.");

    const response = await api.get(`${CONTEXT_ENDPOINT}/${id}/items`);
    return getResponseData(response);
  },

  async getReferenceItemsByGroup(kodeGroup) {
    if (!kodeGroup) throw new Error("Kode group reference wajib diisi.");

    const response = await api.get(`${REFERENCE_ENDPOINT}/${kodeGroup}`);
    return getResponseData(response);
  },

  async createFromContext(contextId, payload = {}) {
    if (!contextId) throw new Error("ID MR Planning Context wajib diisi.");

    const response = await api.post(`${ENDPOINT}/context/${contextId}`, payload);
    return getResponseData(response);
  },

  async createProposalIntake(payload = {}) {
    const response = await api.post(`${ENDPOINT}/proposal-intake`, payload);
    return getResponseData(response);
  },

  async getAll(params = {}) {
    const response = await api.get(ENDPOINT, {
      params: normalizeParams(params),
    });

    return getArrayData(response);
  },

  async getList(params = {}) {
    return this.getAll(params);
  },

  async getRawList(params = {}) {
    const response = await api.get(ENDPOINT, {
      params: normalizeParams(params),
    });

    return getResponseData(response);
  },

  async getById(id, params = {}) {
    if (!id) throw new Error("ID MR Planning Risk wajib diisi.");

    const response = await api.get(`${ENDPOINT}/${id}`, {
      params: normalizeParams(params),
    });

    return getResponseData(response);
  },

  async create(payload = {}) {
    const response = await api.post(ENDPOINT, payload);
    return getResponseData(response);
  },

  async update(id, payload = {}) {
    if (!id) throw new Error("ID MR Planning Risk wajib diisi.");

    // STEP 18E:
    // Draft update wajib memakai context-based service endpoint.
    // Endpoint lama PUT /:id masih mengarah ke mrRiskService legacy.
    const response = await api.put(`${ENDPOINT}/${id}/draft`, payload);
    return getResponseData(response);
  },

  async createRevisi(id, payload = {}) {
    if (!id) throw new Error("ID MR Planning Risk wajib diisi.");

    const response = await api.post(`${ENDPOINT}/${id}/revisi`, payload);
    return getResponseData(response);
  },

  async repairPlaceholderSources(payload = {}) {
    const response = await api.post(`${ENDPOINT}/repair-placeholder-sources`, payload);
    return getResponseData(response);
  },

  async getHistory(id, params = {}) {
    if (!id) throw new Error("ID MR Planning Risk wajib diisi.");

    const response = await api.get(`${ENDPOINT}/${id}/history`, {
      params: normalizeParams(params),
    });

    return getArrayData(response);
  },

  async getHistoryById(historyId, params = {}) {
    if (!historyId) throw new Error("History ID wajib diisi.");

    const response = await api.get(`${ENDPOINT}/history/${historyId}`, {
      params: normalizeParams(params),
    });

    return getResponseData(response);
  },

  async verifikasiHistory(historyId, payload = {}) {
    if (!historyId) throw new Error("History ID wajib diisi.");

    const response = await api.patch(
      `${ENDPOINT}/history/${historyId}/verifikasi`,
      payload
    );

    return getResponseData(response);
  },

  async approveHistory(historyId, payload = {}) {
    if (!historyId) throw new Error("History ID wajib diisi.");

    const response = await api.patch(
      `${ENDPOINT}/history/${historyId}/approve`,
      payload
    );

    return getResponseData(response);
  },

  async tolakHistory(historyId, payload = {}) {
    if (!historyId) throw new Error("History ID wajib diisi.");

    const response = await api.patch(
      `${ENDPOINT}/history/${historyId}/tolak`,
      payload
    );

    return getResponseData(response);
  },

  async rebuildFromHistory(id, payload = {}) {
    if (!id) throw new Error("ID MR Planning Risk wajib diisi.");

    const response = await api.post(
      `${ENDPOINT}/${id}/rebuild-active-from-history`,
      payload
    );

    return getResponseData(response);
  },

  async remove(id) {
    if (!id) throw new Error("ID MR Planning Risk wajib diisi.");

    const response = await api.delete(`${ENDPOINT}/${id}`);
    return getResponseData(response);
  },

  async exportExcel(params = {}) {
    return requestExport({
      path: `${ENDPOINT}/export/excel`,
      params: {
        jenis: "coaching-clinic",
        ...params,
      },
      format: "excel",
    });
  },

  async exportDocx(params = {}) {
    return requestExport({
      path: `${ENDPOINT}/export/docx`,
      params: {
        jenis: "laporan-tahunan",
        ...params,
      },
      format: "docx",
    });
  },

  async exportPdf(params = {}) {
    return requestExport({
      path: `${ENDPOINT}/export/pdf`,
      params: {
        jenis: "laporan-tahunan",
        ...params,
      },
      format: "pdf",
    });
  },
};

export const {
  getAll,
  getList,
  getRawList,
  getById,
  getContexts,
  getContextById,
  getContextItems,
  getReferenceItemsByGroup,
  create,
  createFromContext,
  createProposalIntake,
  update,
  createRevisi,
  getHistory,
  getHistoryById,
  verifikasiHistory,
  approveHistory,
  tolakHistory,
  rebuildFromHistory,
  remove,
  exportExcel,
  exportDocx,
  exportPdf,
} = mrPlanningRiskService;

export default mrPlanningRiskService;
