import api from "@/services/api";

export const getIndikatorRenstra = async (id) => {
  const res = await api.get(`/indikator-umum-renstra/${id}`);
  return res.data;
};

export const updateIndikatorRenstra = async (id, payload) => {
  console.log("🔍 update payload:", payload); // debug
  const res = await api.put(`/indikator-renstra/${id}`, payload);
  return res.data;
};
