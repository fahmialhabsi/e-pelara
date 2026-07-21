// frontend/src/services/mrPlanningTlhpReportService.js
// Modul TLHP — Laporan Pemantauan TLHP (mirip mrPlanningReportService.js,
// tapi di-scope oleh filter tahun/opd/entitas, bukan satu context_id).

import api from '@/services/api';

const ENDPOINT = '/mr-tlhp-report';

const getResponseData = (response) => response?.data;

const assertTahun = (scope = {}) => {
  if (!scope.tahun) {
    throw new Error('Tahun pemantauan wajib dipilih.');
  }
};

const normalizeScope = (scope = {}) =>
  Object.fromEntries(
    Object.entries(scope).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );

const exportReportFile = (scope, type) => {
  assertTahun(scope);

  const endpointMap = {
    word: `${ENDPOINT}/export-word`,
    pdf: `${ENDPOINT}/export-pdf`,
  };

  const endpoint = endpointMap[type];

  if (!endpoint) {
    throw new Error('Format export Laporan Pemantauan TLHP tidak valid.');
  }

  return api.get(endpoint, {
    params: normalizeScope(scope),
    responseType: 'blob',
  });
};

const mrPlanningTlhpReportService = {
  async getSummary(scope = {}) {
    assertTahun(scope);
    const response = await api.get(`${ENDPOINT}/summary`, { params: normalizeScope(scope) });
    return getResponseData(response);
  },

  async getFullReport(scope = {}) {
    assertTahun(scope);
    const response = await api.get(`${ENDPOINT}/full`, { params: normalizeScope(scope) });
    return getResponseData(response);
  },

  async getExportHistory(scope = {}, params = {}) {
    assertTahun(scope);
    const response = await api.get(`${ENDPOINT}/export-history`, {
      params: { ...normalizeScope(scope), ...params },
    });
    return getResponseData(response);
  },

  exportWord(scope) {
    return exportReportFile(scope, 'word');
  },

  exportPdf(scope) {
    return exportReportFile(scope, 'pdf');
  },
};

export default mrPlanningTlhpReportService;
