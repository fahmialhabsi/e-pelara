import api from "./api";

export async function fetchRegulasiVersiList() {
  const res = await api.get("/regulasi/versi");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function fetchRegulasiCompare(fromId, toId) {
  const res = await api.get("/regulasi/compare", {
    params: { from: fromId, to: toId },
  });
  return res.data?.data ?? res.data;
}

export async function postMigrationRunAutoMapping(fromVersiId, toVersiId) {
  const res = await api.post("/migration/run-auto-mapping", {
    fromVersiId,
    toVersiId,
  });
  return res.data;
}

export async function fetchMigrationStatus(fromVersiId, toVersiId) {
  const res = await api.get("/migration/status", {
    params: { from: fromVersiId, to: toVersiId },
  });
  return res.data;
}

export async function postMigrationPreview(fromVersiId, toVersiId) {
  const res = await api.post("/migration/preview", {
    fromVersiId,
    toVersiId,
  });
  return res.data?.data ?? res.data;
}

export async function postMigrationApply(decisions) {
  const res = await api.post("/migration/apply", { decisions });
  return res.data;
}
