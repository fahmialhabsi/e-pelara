/**
 * approvalApi.js — service layer untuk Workflow Approval endpoints.
 */
import api from "./api";

export const approvalApi = {
  /** GET status terkini suatu dokumen */
  async getStatus(entityType, entityId) {
    const { data } = await api.get("/approval/status", {
      params: { entity_type: entityType, entity_id: entityId },
    });
    // Backend sekarang return {success, data: {...}}
    return data?.data || data;
  },

  /** GET riwayat approval (timeline) */
  async getHistory(entityType, entityId) {
    const { data } = await api.get("/approval/history", {
      params: { entity_type: entityType, entity_id: entityId },
    });
    return data?.data || data || [];
  },

  /** GET semua pending (admin) */
  async getPending() {
    const { data } = await api.get("/approval/pending");
    return Array.isArray(data) ? data : (data?.data || []);
  },

  /** POST submit dokumen ke approval */
  async submit(entityType, entityId, catatan = "") {
    const { data } = await api.post("/approval/submit", {
      entity_type: entityType,
      entity_id: entityId,
      catatan,
    });
    return data;
  },

  /** POST approve (admin) */
  async approve(entityType, entityId, catatan = "") {
    const { data } = await api.post("/approval/approve", {
      entity_type: entityType,
      entity_id: entityId,
      catatan,
    });
    return data;
  },

  /** POST reject (admin) */
  async reject(entityType, entityId, catatan) {
    const { data } = await api.post("/approval/reject", {
      entity_type: entityType,
      entity_id: entityId,
      catatan,
    });
    return data;
  },

  /** POST revise — kembalikan ke DRAFT (admin) */
  async revise(entityType, entityId, catatan = "") {
    const { data } = await api.post("/approval/revise", {
      entity_type: entityType,
      entity_id: entityId,
      catatan,
    });
    return data;
  },
};
