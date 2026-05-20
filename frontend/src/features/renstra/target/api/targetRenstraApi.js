// src/features/renstra/api/targetRenstraApi.js
import api from "../../../../services/api";
import { normalizeGovernanceResult } from "../../audit/utils/governanceFlowAdapter";

const requestGovernanceResponse = async (requestFn) => {
  try {
    const response = await requestFn();
    return normalizeGovernanceResult(response);
  } catch (error) {
    return normalizeGovernanceResult(error);
  }
};

export const getRenstraTargets = () => api.get("/renstra-target");
export const getRenstraTargetById = (id) => api.get(`/renstra-target/${id}`);
export const createRenstraTarget = (data) => api.post("/renstra-target", data);
export const updateRenstraTarget = (id, data) =>
  api.put(`/renstra-target/${id}`, data);
export const deleteRenstraTarget = (id) => api.delete(`/renstra-target/${id}`);
export const provisionSubKegiatanRenstraTarget = (data) =>
  requestGovernanceResponse(() =>
    api.post("/rpjmd-governance-sync/sub-kegiatan/provision-target", data),
  );
