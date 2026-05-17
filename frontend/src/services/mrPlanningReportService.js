// frontend/src/services/mrPlanningReportService.js

import api from '@/services/api';

const ENDPOINT = '/mr-report';
const CONTEXT_ENDPOINT = '/mr-planning-context';

const getResponseData = (response) => response?.data;

const assertContextId = (contextId) => {
  if (!contextId) {
    throw new Error('Context laporan MR wajib dipilih.');
  }
};

const buildReportExportEndpoint = (contextId, type) => {
  const endpointMap = {
    excel: `${ENDPOINT}/context/${contextId}/export-excel`,
    word: `${ENDPOINT}/context/${contextId}/export-word`,
    pdf: `${ENDPOINT}/context/${contextId}/export-pdf`,
  };

  return endpointMap[type];
};

const exportReportFile = (contextId, type) => {
  assertContextId(contextId);

  const endpoint = buildReportExportEndpoint(contextId, type);

  if (!endpoint) {
    throw new Error('Format export laporan MR tidak valid.');
  }

  return api.get(endpoint, {
    responseType: 'blob',
  });
};

const mrPlanningReportService = {
  async getContexts(params = {}) {
    const response = await api.get(CONTEXT_ENDPOINT, {
      params: {
        limit: 100,
        ...params,
      },
    });

    return getResponseData(response);
  },

  async getSummary(contextId) {
    assertContextId(contextId);

    const response = await api.get(`${ENDPOINT}/context/${contextId}/summary`);
    return getResponseData(response);
  },

  async getLampiran(contextId) {
    assertContextId(contextId);

    const response = await api.get(`${ENDPOINT}/context/${contextId}/lampiran`);
    return getResponseData(response);
  },

  async getFullReport(contextId) {
    assertContextId(contextId);

    const response = await api.get(`${ENDPOINT}/context/${contextId}/full`);
    return getResponseData(response);
  },

  async getExportHistory(contextId, params = {}) {
    assertContextId(contextId);

    const response = await api.get(`${ENDPOINT}/context/${contextId}/export-history`, { params });

    return getResponseData(response);
  },

  exportExcel(contextId) {
    return exportReportFile(contextId, 'excel');
  },

  exportWord(contextId) {
    return exportReportFile(contextId, 'word');
  },

  exportPdf(contextId) {
    return exportReportFile(contextId, 'pdf');
  },
};

export default mrPlanningReportService;
