// frontend/src/services/mrPlanningMitigationService.js

import api from "./api";

const BASE_URL = "/mr-planning-mitigation";

export const MR_PLANNING_MITIGATION_QUERY_KEYS = {
  all: ["mr-planning-mitigation"],

  byRisk: (riskId, params = {}) => [
    ...MR_PLANNING_MITIGATION_QUERY_KEYS.all,
    "risk",
    String(riskId || ""),
    params,
  ],

  detail: (id) => [
    ...MR_PLANNING_MITIGATION_QUERY_KEYS.all,
    "detail",
    String(id || ""),
  ],

  preview: (riskId) => [
    ...MR_PLANNING_MITIGATION_QUERY_KEYS.all,
    "preview",
    String(riskId || ""),
  ],

  documents: (mitigationId) => [
    ...MR_PLANNING_MITIGATION_QUERY_KEYS.all,
    "documents",
    String(mitigationId || ""),
  ],
};

export const MR_MITIGATION_DOCUMENT_TYPES = [
  {
    value: "SK_TIM_TINDAK_LANJUT",
    label: "SK Tim Pelaksanaan Tindak Lanjut",
  },
  {
    value: "SURAT_TUGAS_TIM_TINDAK_LANJUT",
    label: "Surat Tugas Tim Pelaksanaan Tindak Lanjut",
  },
  {
    value: "RENCANA_AKSI",
    label: "Dokumen Rencana Aksi",
  },
  {
    value: "DOKUMEN_PENDUKUNG_RENCANA",
    label: "Dokumen Pendukung Rencana Pengendalian",
  },
];

export const MR_MITIGATION_DOCUMENT_TYPE_LABELS =
  MR_MITIGATION_DOCUMENT_TYPES.reduce((acc, item) => {
    acc[item.value] = item.label;
    return acc;
  }, {});

const cleanObject = (payload = {}) =>
  Object.fromEntries(
    Object.entries(payload || {}).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    })
  );

const unwrapResponse = (response) => {
  const body = response?.data;
  return body?.data ?? body ?? response;
};

const assertId = (value, label = "ID") => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${label} tidak valid.`);
  }

  return id;
};

/**
 * Mapping hasil preview backend ke schema resmi create/update mitigation.
 *
 * Guard:
 * - Preview memakai nama field khusus untuk kebutuhan form.
 * - Create/update mitigation memakai strict schema backend.
 * - Frontend tidak boleh mengirim meta preview.
 * - Frontend tidak boleh mengirim field teknis, workflow, approval, score, level,
 *   atau field yang tidak dikenal backend.
 * - Backend tetap menghitung skor dan level setelah mitigasi.
 */
const mapPreviewToMitigationPayload = (values = {}) => {
  const riskAnalysisId =
    values.risk_analysis_id ||
    values.mr_planning_risk_analysis_id ||
    null;

  const rootCauseId =
    values.root_cause_id ||
    values.mr_planning_root_cause_id ||
    null;

  const riskAfterLikelihoodRefId =
    values.risk_after_mitigation_likelihood_ref_id ||
    values.after_likelihood_ref_id ||
    null;

  const riskAfterImpactRefId =
    values.risk_after_mitigation_impact_ref_id ||
    values.after_impact_ref_id ||
    null;

  const kegiatanPengendalian = values.kegiatan_pengendalian || "";
  const uraianMitigasi =
    values.uraian_mitigasi ||
    kegiatanPengendalian ||
    "";

  const tindakLanjut =
    values.tindak_lanjut ||
    values.catatan_mitigasi ||
    "Pemilik Risiko meninjau, melengkapi, dan menetapkan rencana tindak pengendalian sebelum diajukan sebagai rencana resmi.";

  return {
    risk_analysis_id: riskAnalysisId,
    root_cause_id: rootCauseId,

    uraian_mitigasi: uraianMitigasi,
    jenis_mitigasi:
      values.jenis_mitigasi ||
      "Rencana Tindak Pengendalian",

    respon_risiko_ref_id: values.respon_risiko_ref_id,
    unsur_spip_ref_id: values.unsur_spip_ref_id,
    sub_unsur_spip_ref_id: values.sub_unsur_spip_ref_id,
    output_rtp_ref_id: values.output_rtp_ref_id,

    kegiatan_pengendalian: kegiatanPengendalian,
    target_output: values.target_output,
    indikator_keluaran: values.indikator_keluaran,
    target_keluaran: values.target_keluaran,
    satuan_keluaran: values.satuan_keluaran,

    target_tanggal: values.target_tanggal || values.target_waktu,
    tanggal_mulai: values.tanggal_mulai,
    tanggal_selesai: values.tanggal_selesai,
    target_waktu_mulai: values.target_waktu_mulai,
    target_waktu_selesai: values.target_waktu_selesai,

    risk_after_mitigation_likelihood_ref_id: riskAfterLikelihoodRefId,
    risk_after_mitigation_impact_ref_id: riskAfterImpactRefId,

    requires_spip_rtp:
      typeof values.requires_spip_rtp === "boolean"
        ? values.requires_spip_rtp
        : false,

    penanggung_jawab: values.penanggung_jawab,
    status_mitigasi: values.status_mitigasi || "direncanakan",
    progress_persen: values.progress_persen ?? 0,
    kendala: values.kendala,
    tindak_lanjut: tindakLanjut,

    alasan_revisi:
      values.alasan_revisi ||
      "Penyusunan awal Rencana Tindak Pengendalian berdasarkan hasil identifikasi, analisis, dan akar permasalahan risiko.",
  };
};

/**
 * Payload resmi untuk create/update Rencana Tindak Pengendalian.
 *
 * Field yang sengaja tidak dikirim:
 * - meta
 * - catatan_mitigasi
 * - mr_planning_risk_analysis_id
 * - mr_planning_root_cause_id
 * - after_likelihood_ref_id
 * - after_impact_ref_id
 * - score/level hasil perhitungan
 * - approval/workflow actor
 */
const buildMitigationPayload = (values = {}) =>
  cleanObject(mapPreviewToMitigationPayload(values));

const getByRisk = async (riskId, params = {}) => {
  const id = assertId(riskId, "ID Risiko");
  const response = await api.get(`${BASE_URL}/risk/${id}`, { params });
  return unwrapResponse(response);
};

const getById = async (id) => {
  const mitigationId = assertId(id, "ID Rencana Tindak Pengendalian");
  const response = await api.get(`${BASE_URL}/${mitigationId}`);
  return unwrapResponse(response);
};

const previewDraftFromRisk = async (riskId) => {
  const id = assertId(riskId, "ID Risiko");
  const response = await api.post(`${BASE_URL}/risk/${id}/draft-preview`);
  return unwrapResponse(response);
};

const createFromRisk = async (riskId, values = {}) => {
  const id = assertId(riskId, "ID Risiko");
  const payload = buildMitigationPayload(values);

  const response = await api.post(`${BASE_URL}/risk/${id}`, payload);
  return unwrapResponse(response);
};

const updateDraft = async (id, values = {}) => {
  const mitigationId = assertId(id, "ID Rencana Tindak Pengendalian");
  const payload = buildMitigationPayload(values);

  const response = await api.put(`${BASE_URL}/${mitigationId}/draft`, payload);
  return unwrapResponse(response);
};

const cancelDraft = async (id, values = {}) => {
  const mitigationId = assertId(id, "ID Rencana Tindak Pengendalian");

  const payload = cleanObject({
    alasan_pembatalan:
      values.alasan_pembatalan ||
      values.alasan_revisi ||
      "Draft Rencana Tindak Pengendalian dibatalkan oleh pengguna.",
  });

  const response = await api.patch(
    `${BASE_URL}/${mitigationId}/cancel`,
    payload
  );

  return unwrapResponse(response);
};

const getDocumentTypeLabel = (documentType) =>
  MR_MITIGATION_DOCUMENT_TYPE_LABELS[documentType] ||
  "Dokumen Rencana Tindak Pengendalian";

const getDocumentDescriptionByType = (documentType) => {
  const descriptions = {
    SK_TIM_TINDAK_LANJUT:
      "Dokumen dasar pembentukan Tim Pelaksanaan Tindak Lanjut atas Rencana Tindak Pengendalian.",
    SURAT_TUGAS_TIM_TINDAK_LANJUT:
      "Surat tugas pelaksanaan tindak lanjut atas Rencana Tindak Pengendalian.",
    RENCANA_AKSI:
      "Dokumen rencana aksi pelaksanaan Rencana Tindak Pengendalian.",
    DOKUMEN_PENDUKUNG_RENCANA:
      "Dokumen pendukung rencana pengendalian yang menjadi dasar pelaksanaan tindak lanjut.",
  };

  return (
    descriptions[documentType] ||
    "Dokumen pendukung Rencana Tindak Pengendalian."
  );
};

const getMitigationTargetDate = (mitigation = {}) => {
  const value =
    mitigation.target_tanggal ||
    mitigation.target_waktu ||
    mitigation.target_waktu_selesai ||
    mitigation.tanggal_selesai ||
    null;

  if (value) return String(value).slice(0, 10);

  return new Date().toISOString().slice(0, 10);
};

const buildDefaultMitigationDocumentValues = (
  mitigation = {},
  documentType = "SK_TIM_TINDAK_LANJUT"
) => {
  const label = getDocumentTypeLabel(documentType);
  const documentDate = getMitigationTargetDate(mitigation);
  const mitigationId = mitigation.id || mitigation.mr_planning_mitigation_id;
  const year = String(documentDate).slice(0, 4);

  return {
    document_type: documentType,
    document_title: label,
    document_number: mitigationId ? `DRAFT/RTP/${mitigationId}/${year}` : "",
    document_date: documentDate,
    description: getDocumentDescriptionByType(documentType),
  };
};

const getDocuments = async (mitigationId) => {
  const id = assertId(mitigationId, "ID Rencana Tindak Pengendalian");
  const response = await api.get(`${BASE_URL}/${id}/documents`);
  return unwrapResponse(response);
};

const uploadDocument = async (mitigationId, values = {}) => {
  const id = assertId(mitigationId, "ID Rencana Tindak Pengendalian");

  if (!values.file) {
    throw new Error("Dokumen wajib dipilih.");
  }

  const payload = new FormData();

  payload.append("document_type", values.document_type || "");
  payload.append("document_title", values.document_title || "");
  payload.append("document_number", values.document_number || "");
  payload.append("document_date", values.document_date || "");
  payload.append("description", values.description || "");

  // Harus sebelum file agar backend menyimpan ke folder dokumen RTP.
  payload.append("entity_type", "mr_planning_mitigation_documents");

  payload.append("file", values.file);

  const response = await api.post(`${BASE_URL}/${id}/documents`, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return unwrapResponse(response);
};

const cancelDocument = async (documentId, cancelReason) => {
  const id = assertId(documentId, "ID Dokumen");

  const response = await api.patch(`${BASE_URL}/documents/${id}/cancel`, {
    cancel_reason:
      cancelReason ||
      "Dokumen dibatalkan melalui halaman Rencana Tindak Pengendalian.",
  });

  return unwrapResponse(response);
};

const mrPlanningMitigationService = {
  getByRisk,
  getById,
  previewDraftFromRisk,
  createFromRisk,
  updateDraft,
  cancelDraft,
  buildMitigationPayload,
  mapPreviewToMitigationPayload,

  getDocuments,
  uploadDocument,
  cancelDocument,
  buildDefaultMitigationDocumentValues,
};

export default mrPlanningMitigationService;