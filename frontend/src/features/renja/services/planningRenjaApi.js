import api from "../../../services/api";

function unwrap(res) {
  return res.data?.data ?? res.data;
}

function throwOfficialValidationFromResponse(res) {
  if (!(res.data instanceof ArrayBuffer)) {
    const err = new Error(res.data?.message || "Ekspor dokumen gagal.");
    throw err;
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

/**
 * Preview perencanaan (bukan dokumen Renja OPD resmi struktur bab).
 * Backend: POST .../generate-docx | generate-pdf
 */
export async function downloadRenjaDokumenDocx(dokumenId) {
  return api.post(`/renja/dokumen/${dokumenId}/generate-docx`, {}, { responseType: "arraybuffer" });
}

export async function downloadRenjaDokumenPdf(dokumenId) {
  return api.post(`/renja/dokumen/${dokumenId}/generate-pdf`, {}, { responseType: "arraybuffer" });
}

/** Dokumen Renja OPD resmi (BAB I–V, OOXML / PDF terstruktur). */
export async function downloadRenjaOfficialDocx(dokumenId) {
  return api.post(
    `/renja/dokumen/${dokumenId}/generate-official-docx`,
    {},
    { responseType: "arraybuffer", validateStatus: (s) => s === 200 || s === 400 },
  );
}

export async function downloadRenjaOfficialPdf(dokumenId) {
  return api.post(
    `/renja/dokumen/${dokumenId}/generate-official-pdf`,
    {},
    { responseType: "arraybuffer", validateStatus: (s) => s === 200 || s === 400 },
  );
}

/** Prasyarat ekspor resmi (tanpa membuat file / versi baru). */
export async function fetchRenjaValidateOfficial(dokumenId) {
  const res = await api.get(`/renja/dokumen/${dokumenId}/validate-official`);
  return unwrap(res);
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

export async function saveRenjaDokumenDocxToFile(dokumenId, label = "Renja") {
  const res = await downloadRenjaDokumenDocx(dokumenId);
  const safe = String(label).replace(/\s+/g, "_").slice(0, 80);
  triggerBlobDownload(
    res,
    `renja-preview-${dokumenId}-${safe}.docx`,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}

export async function saveRenjaDokumenPdfToFile(dokumenId, label = "Renja") {
  const res = await downloadRenjaDokumenPdf(dokumenId);
  const safe = String(label).replace(/\s+/g, "_").slice(0, 80);
  triggerBlobDownload(res, `renja-preview-${dokumenId}-${safe}.pdf`, "application/pdf");
}

export async function saveRenjaOfficialDocxToFile(dokumenId, label = "Renja-OPD-resmi") {
  const res = await downloadRenjaOfficialDocx(dokumenId);
  if (res.status === 400) throwOfficialValidationFromResponse(res);
  if (res.status !== 200) throw new Error("Gagal mengunduh dokumen resmi Word.");
  const ver = res.headers?.["x-document-version"] || "";
  const safe = String(label).replace(/\s+/g, "_").slice(0, 80);
  const suffix = ver ? `-v${ver}` : "";
  triggerBlobDownload(
    res,
    `renja-opd-resmi-${dokumenId}${suffix}-${safe}.docx`,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}

export async function saveRenjaOfficialPdfToFile(dokumenId, label = "Renja-OPD-resmi") {
  const res = await downloadRenjaOfficialPdf(dokumenId);
  if (res.status === 400) throwOfficialValidationFromResponse(res);
  if (res.status !== 200) throw new Error("Gagal mengunduh dokumen resmi PDF.");
  const ver = res.headers?.["x-document-version"] || "";
  const safe = String(label).replace(/\s+/g, "_").slice(0, 80);
  const suffix = ver ? `-v${ver}` : "";
  triggerBlobDownload(res, `renja-opd-resmi-${dokumenId}${suffix}-${safe}.pdf`, "application/pdf");
}

export async function fetchReferensiBuatDokumenRenja(params = {}) {
  const res = await api.get("/renja/referensi/buat-dokumen", { params });
  return unwrap(res);
}

export async function createRenjaDokumenV2(body) {
  const res = await api.post("/renja/dokumen", body);
  return unwrap(res);
}

export async function fetchRenjaDokumenById(id) {
  const res = await api.get(`/renja/dokumen/${id}`);
  return unwrap(res);
}

export async function updateRenjaDokumenV2(id, body) {
  const res = await api.put(`/renja/dokumen/${id}`, body);
  return unwrap(res);
}

export async function fetchRenjaDokumenAudit(dokumenId) {
  const res = await api.get(`/renja/dokumen/${dokumenId}/audit`);
  return unwrap(res) || [];
}

export async function fetchRenjaDokumenChangeLog(dokumenId) {
  const res = await api.get(`/renja/dokumen/${dokumenId}/change-log`);
  return unwrap(res) || [];
}

export async function createRenjaItemV2(body) {
  const res = await api.post("/renja/item", body);
  return unwrap(res);
}

export async function updateRenjaItemV2(id, body) {
  const res = await api.put(`/renja/item/${id}`, body);
  return unwrap(res);
}

export async function linkRenjaItemToRkpd(renjaItemId, rkpdItemId, meta = {}) {
  const res = await api.post(`/renja/item/${renjaItemId}/link-rkpd`, {
    rkpd_item_id: rkpdItemId,
    ...meta,
  });
  return res.data?.data ?? res.data;
}
