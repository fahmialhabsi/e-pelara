/**
 * API master referensi (Program → Kegiatan → Sub Kegiatan → Indikator).
 * - Cache modul: Map per dataset + parent id (program / kegiatan / sub); hindari refetch berulang.
 * - invalidateMasterCache() untuk kosongkan setelah impor ulang / ganti dataset.
 */
import api from "./api";
import { extractListData } from "../utils/apiResponse";
import {
  normalizeProgramKodeForDisplay,
} from "../utils/programDisplayLabel.js";

/** Default dataset untuk GET /api/master-program (sinkron backend masterReferensiController). */
export const MASTER_REFERENSI_DATASET_DEFAULT = "kepmendagri_provinsi_900_2024";

/** Label badge UI untuk mode input dari referensi Kepmendagri. */
export const MASTER_REFERENSI_BADGE_LABEL =
  "MASTER · Kepmendagri 900/2024";

export const MANUAL_INPUT_BADGE_LABEL = "MANUAL";

const withSignal = (config = {}, signal) =>
  signal ? { ...config, signal } : config;

/** @type {{ program: Map<string, unknown[]>, kegiatan: Map<string, unknown[]>, subKegiatan: Map<string, unknown[]>, indikator: Map<string, unknown[]> }} */
const cache = {
  program: new Map(),
  kegiatan: new Map(),
  subKegiatan: new Map(),
  indikator: new Map(),
};

function programCacheKey(datasetKey) {
  return datasetKey || "__default__";
}

function kegiatanCacheKey(datasetKey, programId) {
  return `${programCacheKey(datasetKey)}|p:${programId}`;
}

function subCacheKey(datasetKey, kegiatanId) {
  return `${programCacheKey(datasetKey)}|k:${kegiatanId}`;
}

function indikatorCacheKey(datasetKey, subKegiatanId) {
  return `${programCacheKey(datasetKey)}|s:${subKegiatanId}`;
}

function cloneRows(rows) {
  return Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
}

/**
 * Hapus cache master (mis. setelah impor ulang / ganti dataset).
 * @param {{ datasetKey?: string }} [scope] — tanpa argumen: kosongkan semua
 */
export function invalidateMasterCache(scope = {}) {
  const dk = scope.datasetKey;
  if (dk == null || dk === "") {
    cache.program.clear();
    cache.kegiatan.clear();
    cache.subKegiatan.clear();
    cache.indikator.clear();
    return;
  }
  const prefix = programCacheKey(dk);
  for (const key of [...cache.program.keys()]) {
    if (key === prefix) cache.program.delete(key);
  }
  for (const map of [cache.kegiatan, cache.subKegiatan, cache.indikator]) {
    for (const key of [...map.keys()]) {
      if (key.startsWith(`${prefix}|`)) map.delete(key);
    }
  }
}

export const SNAPSHOT_LABEL_SEP = " - ";

/** Dropdown master: selalu kode + pemisah + nama (tidak nama saja). */
export function formatMasterProgramLabel(row, sep = " - ") {
  if (!row) return "";
  const rawK =
    row.kode_program_full != null && String(row.kode_program_full).trim() !== ""
      ? row.kode_program_full
      : row.kode_program;
  const k = normalizeProgramKodeForDisplay(rawK || "");
  const n = String(row.nama_program ?? "").trim();
  if (k && n) return `${k}${sep}${n}`;
  if (k) return k;
  if (n) return `[${row.id ?? "?"}]${sep}${n}`;
  return String(row.id ?? "");
}

export function formatMasterKegiatanLabel(row, sep = " - ") {
  if (!row) return "";
  const k = String(row.kode_kegiatan_full ?? row.kode_kegiatan ?? "").trim();
  const n = String(row.nama_kegiatan ?? "").trim();
  if (k && n) return `${k}${sep}${n}`;
  if (k) return k;
  if (n) return `[${row.id ?? "?"}]${sep}${n}`;
  return String(row.id ?? "");
}

export function formatMasterSubKegiatanLabel(row, sep = " - ") {
  if (!row) return "";
  const k = String(
    row.kode_sub_kegiatan_full ?? row.kode_sub_kegiatan ?? "",
  ).trim();
  const n = String(row.nama_sub_kegiatan ?? "").trim();
  if (k && n) return `${k}${sep}${n}`;
  if (k) return k;
  if (n) return `[${row.id ?? "?"}]${sep}${n}`;
  return String(row.id ?? "");
}

/** Label untuk audit / export / snapshot transaksi (pemisah " - "). */
export function snapshotProgramLabel(row) {
  return formatMasterProgramLabel(row, SNAPSHOT_LABEL_SEP);
}

export function snapshotKegiatanLabel(row) {
  return formatMasterKegiatanLabel(row, SNAPSHOT_LABEL_SEP);
}

export function snapshotSubKegiatanLabel(row) {
  return formatMasterSubKegiatanLabel(row, SNAPSHOT_LABEL_SEP);
}

/**
 * @param {string} [datasetKey]
 * @param {{ signal?: AbortSignal, bypassCache?: boolean, allDatasets?: boolean }} [opts]
 * @returns {Promise<{ data: unknown[], warning?: object }>}
 */
export async function fetchMasterPrograms(datasetKey, opts = {}) {
  const { signal, bypassCache, allDatasets } = opts;
  const explicit =
    datasetKey != null && String(datasetKey).trim() !== ""
      ? String(datasetKey).trim()
      : null;
  const requestDataset = allDatasets
    ? MASTER_REFERENSI_DATASET_DEFAULT
    : (explicit ?? MASTER_REFERENSI_DATASET_DEFAULT);
  const cacheKeyStr = allDatasets
    ? `_retry_${explicit ?? "none"}`
    : (explicit ?? MASTER_REFERENSI_DATASET_DEFAULT);
  const key = programCacheKey(cacheKeyStr);
  if (!bypassCache && cache.program.has(key)) {
    return { data: cloneRows(cache.program.get(key)), warning: undefined };
  }

  const params = { dataset_key: requestDataset };
  const res = await api.get("/master-program", withSignal({ params }, signal));
  const rows = extractListData(res.data);
  const warning = res.data?.meta?.warning;
  if (!signal?.aborted) {
    cache.program.set(key, cloneRows(rows));
  }
  return { data: rows, warning };
}

/**
 * @param {number|string} programId
 * @param {{ datasetKey?: string, signal?: AbortSignal, bypassCache?: boolean }} [opts]
 * @returns {Promise<{ data: unknown[], warning?: object }>}
 */
export async function fetchMasterKegiatanByProgram(programId, opts = {}) {
  if (programId == null || programId === "") {
    return { data: [], warning: undefined };
  }
  const { datasetKey, signal, bypassCache } = opts;
  const dkResolved =
    datasetKey != null && String(datasetKey).trim() !== ""
      ? String(datasetKey).trim()
      : MASTER_REFERENSI_DATASET_DEFAULT;
  const ckey = kegiatanCacheKey(dkResolved, programId);
  if (!bypassCache && cache.kegiatan.has(ckey)) {
    return { data: cloneRows(cache.kegiatan.get(ckey)), warning: undefined };
  }

  const params = { program_id: programId, dataset_key: dkResolved };
  const res = await api.get("/master-kegiatan", withSignal({ params }, signal));
  const rows = extractListData(res.data);
  const warning = res.data?.meta?.warning;
  if (!signal?.aborted && !warning) {
    cache.kegiatan.set(ckey, cloneRows(rows));
  }
  return { data: rows, warning };
}

export async function fetchMasterSubKegiatanByKegiatan(kegiatanId, opts = {}) {
  if (kegiatanId == null || kegiatanId === "") {
    return { data: [], warning: undefined };
  }
  const { datasetKey, signal, bypassCache } = opts;
  const dkResolved =
    datasetKey != null && String(datasetKey).trim() !== ""
      ? String(datasetKey).trim()
      : MASTER_REFERENSI_DATASET_DEFAULT;
  const ckey = subCacheKey(dkResolved, kegiatanId);
  if (!bypassCache && cache.subKegiatan.has(ckey)) {
    return { data: cloneRows(cache.subKegiatan.get(ckey)), warning: undefined };
  }

  const params = { kegiatan_id: kegiatanId, dataset_key: dkResolved };
  const res = await api.get("/master-sub-kegiatan", withSignal({ params }, signal));
  const rows = extractListData(res.data);
  const warning = res.data?.meta?.warning;
  if (!signal?.aborted && !warning) {
    cache.subKegiatan.set(ckey, cloneRows(rows));
  }
  return { data: rows, warning };
}

export async function fetchMasterIndikatorBySubKegiatan(subKegiatanId, opts = {}) {
  if (subKegiatanId == null || subKegiatanId === "") {
    return { data: [], warning: undefined };
  }
  const { datasetKey, signal, bypassCache } = opts;
  const ckey = indikatorCacheKey(datasetKey, subKegiatanId);
  if (!bypassCache && cache.indikator.has(ckey)) {
    return { data: cloneRows(cache.indikator.get(ckey)), warning: undefined };
  }

  const params = { subKegiatanId };
  if (datasetKey) params.datasetKey = datasetKey;
  const res = await api.get("/master/indikator", withSignal({ params }, signal));
  const rows = extractListData(res.data);
  const warning = res.data?.meta?.warning;
  if (!signal?.aborted && !warning) {
    cache.indikator.set(ckey, cloneRows(rows));
  }
  return { data: rows, warning };
}

export function getMasterApiErrorMessage(err) {
  const d = err?.response?.data;
  if (d && typeof d === "object" && typeof d.message === "string") {
    return d.code ? `${d.message} (${d.code})` : d.message;
  }
  if (typeof d?.error === "string") return d.error;
  if (Array.isArray(d?.error) && d.error[0]?.msg) return d.error[0].msg;
  return err?.message || "Permintaan gagal";
}

export function getMasterApiErrorCode(err) {
  const d = err?.response?.data;
  if (d && typeof d === "object" && typeof d.code === "string") return d.code;
  return null;
}
