import api from "../../../services/api";

function unwrap(res) {
  return res.data?.data ?? res.data;
}

function throwOfficialValidationFromResponse(res) {
  if (!(res.data instanceof ArrayBuffer)) {
    throw new Error(res.data?.message || "Ekspor dokumen gagal.");
  }
  const text = new TextDecoder().decode(res.data);
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error("Ekspor dokumen gagal.");
  }
  const msg =
    (j.errors || []).map((e) => e.message).join(" · ") ||
    j.message ||
    "Validasi dokumen resmi gagal.";
  const err = new Error(msg);
  err.validationErrors = j.errors || [];
  throw err;
}

export async function fetchRkpdDokumenList(params = {}) {
  const res = await api.get("/rkpd/dokumen", { params });
  return unwrap(res) || [];
}

export async function fetchRkpdDokumenById(id) {
  const res = await api.get(`/rkpd/dokumen/${id}`);
  return unwrap(res);
}

export async function createRkpdDokumenV2(body) {
  const res = await api.post("/rkpd/dokumen", body);
  return unwrap(res);
}

export async function updateRkpdDokumenV2(id, body) {
  const res = await api.put(`/rkpd/dokumen/${id}`, body);
  return unwrap(res);
}

export async function fetchRkpdDokumenAudit(dokumenId) {
  const res = await api.get(`/rkpd/dokumen/${dokumenId}/audit`);
  return unwrap(res) || [];
}

export async function fetchRkpdDokumenChangeLog(dokumenId) {
  const res = await api.get(`/rkpd/dokumen/${dokumenId}/change-log`);
  return unwrap(res) || [];
}

export async function createRkpdItemV2(body) {
  const res = await api.post("/rkpd/item", body);
  return unwrap(res);
}

export async function updateRkpdItemV2(id, body) {
  const res = await api.put(`/rkpd/item/${id}`, body);
  return res.data;
}

function triggerBlobDownload(response, filename, mime) {
  const blob = new Blob([response.data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function saveRkpdDokumenDocxToFile(dokumenId, label = "RKPD") {
  const res = await api.post(
    `/rkpd/dokumen/${dokumenId}/generate-docx`,
    {},
    { responseType: "arraybuffer" },
  );
  const safe = String(label).replace(/\s+/g, "_").slice(0, 80);
  triggerBlobDownload(
    res,
    `rkpd-preview-${dokumenId}-${safe}.docx`,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}

export async function saveRkpdDokumenPdfToFile(dokumenId, label = "RKPD") {
  const res = await api.post(
    `/rkpd/dokumen/${dokumenId}/generate-pdf`,
    {},
    { responseType: "arraybuffer" },
  );
  const safe = String(label).replace(/\s+/g, "_").slice(0, 80);
  triggerBlobDownload(res, `rkpd-preview-${dokumenId}-${safe}.pdf`, "application/pdf");
}

export async function fetchRkpdValidateOfficial(dokumenId) {
  const res = await api.get(`/rkpd/dokumen/${dokumenId}/validate-official`);
  return unwrap(res);
}

export async function saveRkpdOfficialDocxToFile(dokumenId, label = "RKPD-resmi") {
  const res = await api.post(
    `/rkpd/dokumen/${dokumenId}/generate-official-docx`,
    {},
    { responseType: "arraybuffer", validateStatus: (s) => s === 200 || s === 400 },
  );
  if (res.status === 400) throwOfficialValidationFromResponse(res);
  if (res.status !== 200) throw new Error("Gagal mengunduh dokumen resmi Word.");
  const ver = res.headers?.["x-document-version"] || "";
  const safe = String(label).replace(/\s+/g, "_").slice(0, 80);
  const suffix = ver ? `-v${ver}` : "";
  triggerBlobDownload(
    res,
    `rkpd-resmi-${dokumenId}${suffix}-${safe}.docx`,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}

export async function saveRkpdOfficialPdfToFile(dokumenId, label = "RKPD-resmi") {
  const res = await api.post(
    `/rkpd/dokumen/${dokumenId}/generate-official-pdf`,
    {},
    { responseType: "arraybuffer", validateStatus: (s) => s === 200 || s === 400 },
  );
  if (res.status === 400) throwOfficialValidationFromResponse(res);
  if (res.status !== 200) throw new Error("Gagal mengunduh dokumen resmi PDF.");
  const ver = res.headers?.["x-document-version"] || "";
  const safe = String(label).replace(/\s+/g, "_").slice(0, 80);
  const suffix = ver ? `-v${ver}` : "";
  triggerBlobDownload(res, `rkpd-resmi-${dokumenId}${suffix}-${safe}.pdf`, "application/pdf");
}
