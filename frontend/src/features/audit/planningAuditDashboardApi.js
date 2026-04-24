import api from "@/services/api";

export async function fetchPlanningAuditList(params) {
  const res = await api.get("/planning-audit", { params });
  return res.data;
}

export async function fetchPlanningAuditSummary(params) {
  const res = await api.get("/planning-audit/summary", { params });
  return res.data;
}

export async function fetchPlanningAuditDetail(recordKey) {
  const res = await api.get(`/planning-audit/${encodeURIComponent(recordKey)}`);
  return res.data;
}
