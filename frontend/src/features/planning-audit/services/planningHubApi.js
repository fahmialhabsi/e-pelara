import api from "../../../services/api";

export const fetchDocumentTrace = async (documentType, documentId) => {
  const res = await api.get(`/planning/trace/${documentType}/${documentId}`);
  return res.data?.data ?? res.data;
};

export const fetchDocumentVersions = async (documentType, documentId) => {
  const res = await api.get(`/planning/versions/${documentType}/${documentId}`);
  return res.data?.data ?? [];
};

/**
 * Pulihkan state dokumen utama dari snapshot versi global (wajib alasan).
 * Mengembalikan body respons penuh { success, message, data } agar UI bisa membaca restore_meta.
 */
export const restorePlanningDocumentVersion = async (versionId, body) => {
  const res = await api.post(`/planning/versions/${versionId}/restore`, body);
  return res.data;
};
