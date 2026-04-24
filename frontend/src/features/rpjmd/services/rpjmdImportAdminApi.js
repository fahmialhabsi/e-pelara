import api from "../../../services/api";

function unwrap(res) {
  const p = res?.data;
  if (p && p.success === true) return p.data;
  return p;
}

const paths = {
  u228: "urusan-kinerja",
  apbd: "apbd-proyeksi",
  t31: "tujuan-sasaran",
  arah: "arah-kebijakan",
  iku: "iku",
  indikator_tujuan: "indikator-tujuan",
  indikator_sasaran: "indikator-sasaran",
  indikator_strategi: "indikator-strategi",
  indikator_arah_kebijakan: "indikator-arah-kebijakan",
  indikator_program: "indikator-program",
  indikator_kegiatan: "indikator-kegiatan",
  indikator_sub_kegiatan: "indikator-sub-kegiatan",
};

export async function rpjmdImportCreate(tableKey, periodeId, body) {
  const seg = paths[tableKey];
  if (!seg) throw new Error("Tabel impor tidak dikenal.");
  const res = await api.post(`/rpjmd-import/${seg}/${periodeId}`, body);
  return unwrap(res);
}

export async function rpjmdImportUpdate(tableKey, periodeId, rowId, body) {
  const seg = paths[tableKey];
  if (!seg) throw new Error("Tabel impor tidak dikenal.");
  const res = await api.put(`/rpjmd-import/${seg}/${periodeId}/${rowId}`, body);
  return unwrap(res);
}

export async function rpjmdImportDelete(tableKey, periodeId, rowId) {
  const seg = paths[tableKey];
  if (!seg) throw new Error("Tabel impor tidak dikenal.");
  const res = await api.delete(`/rpjmd-import/${seg}/${periodeId}/${rowId}`);
  return unwrap(res);
}

/** Alias eksplisit untuk tab indikator RPJMD (endpoint sama dengan rpjmdImport*). */
export async function rpjmdIndikatorCreate(kind, periodeId, body) {
  return rpjmdImportCreate(kind, periodeId, body);
}

export async function rpjmdIndikatorUpdate(kind, periodeId, rowId, body) {
  return rpjmdImportUpdate(kind, periodeId, rowId, body);
}

export async function rpjmdIndikatorDelete(kind, periodeId, rowId) {
  return rpjmdImportDelete(kind, periodeId, rowId);
}

/**
 * Preview impor Excel indikator (multipart, field `file`).
 * @param {string} importTable — nama sheet/tabel backend, mis. indikatortujuans, indikatorsasarans, …
 */
export async function rpjmdIndikatorPreview(periodeId, file, importTable) {
  if (!periodeId || !file) throw new Error("Periode dan berkas wajib diisi.");
  if (!importTable) throw new Error("importTable wajib (sheet yang diproses).");
  const fd = new FormData();
  fd.append("file", file);
  const q = new URLSearchParams({
    periodeId: String(periodeId),
    importTable: String(importTable),
  });
  const res = await api.post(`/rpjmd-import/indikator/preview?${q.toString()}`, fd);
  return unwrap(res);
}

/** Terapkan hasil preview (insert DB). */
export async function rpjmdIndikatorApply(periodeId, previewId) {
  const res = await api.post(`/rpjmd-import/indikator/apply`, {
    periodeId,
    previewId,
  });
  return unwrap(res);
}
