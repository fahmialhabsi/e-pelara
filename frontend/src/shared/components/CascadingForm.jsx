/**
 * CascadingForm.jsx — Form Input Cascading RPJMD
 *
 * Strategi fetch (2 mode):
 * - Edit mode  : semua opsi di-fetch PARALEL sekaligus menggunakan ID dari existingData.
 *               Tidak ada ketergantungan sequential, tidak ada periode_id di prioritas.
 * - New mode   : opsi di-fetch CASCADE sesuai pilihan pengguna (parent → child).
 *
 * Perbaikan vs versi lama:
 * 1. Edit mode: fetch paralel → tidak ada race condition atau urutan yang salah.
 * 2. useEffect hanya re-run jika dokumen/tahun/ID record berubah (bukan periodeAktifId).
 * 3. periode_id TIDAK dikirim ke endpoint prioritas — penyebab list kosong utama.
 * 4. mergeRowsWithSnapshot menginjeksi opsi sintetis bila nested object null.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Form,
  Button,
  Spinner,
  Card,
  Alert,
  Breadcrumb,
  Container,
  Badge,
  Row,
  Col,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import CascadingSelectField from "./CascadingSelectField";
import CascadingMultiSelectField from "./CascadingMultiSelectField";
import { useDokumen } from "../../hooks/useDokumen";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";
import { normalizeId, normalizeListItems } from "../../utils/apiResponse";

// ─── Konstanta level cascading ──────────────────────────────────────────────

const LEVELS = [
  { key: "misi",         label: "Misi",                  api: "misi",             paramKey: null,          group: "rpjmd" },
  { key: "priorNasional",label: "Prioritas Nasional",     api: "prioritas-nasional",paramKey: "misi",        group: "prioritas" },
  { key: "priorDaerah",  label: "Prioritas Daerah",       api: "prioritas-daerah", paramKey: "priorNasional",group: "prioritas" },
  { key: "priorKepda",   label: "Prioritas Kepala Daerah",api: "prioritas-gubernur",paramKey: "priorDaerah", group: "prioritas" },
  { key: "tujuan",       label: "Tujuan",                 api: "tujuan",           paramKey: "misi",         group: "rpjmd" },
  { key: "sasaran",      label: "Sasaran",                api: "sasaran",          paramKey: "tujuan",       group: "rpjmd" },
  { key: "strategi",     label: "Strategi",               api: "strategi",         paramKey: "sasaran",      group: "rpjmd", multi: true },
  { key: "arahKebijakan",label: "Arah Kebijakan",         api: "arah-kebijakan",   paramKey: "strategi",     group: "rpjmd", multi: true },
  { key: "program",      label: "Program",                api: "programs",         paramKey: "sasaran",      group: "program" },
  { key: "kegiatan",     label: "Kegiatan",               api: "kegiatan",         paramKey: "program",      group: "program" },
  { key: "subKegiatan",  label: "Sub Kegiatan",           api: "sub-kegiatan",     paramKey: "kegiatan",     group: "program" },
];

// Limit besar agar seluruh pilihan tersedia di edit mode
const FETCH_LIMITS = {
  misi: {},
  "prioritas-nasional": { page: 1, limit: 1000 },
  "prioritas-daerah":   { page: 1, limit: 1000 },
  "prioritas-gubernur": { page: 1, limit: 1000 },
  tujuan:               { limit: 1000, offset: 0 },
  sasaran:              { limit: 1000, offset: 0 },
  strategi:             { page: 1, limit: 1000 },
  "arah-kebijakan":     { page: 1, limit: 1000 },
  programs:             { page: 1, limit: 1000 },
  kegiatan:             { page: 1, limit: 1000 },
  "sub-kegiatan":       { page: 1, limit: 1000 },
};

// FK field pada tabel cascading → key di LEVELS
const FK_MAP = {
  misi:          "misi_id",
  priorNasional: "prior_nas_id",
  priorDaerah:   "prior_daerah_id",
  priorKepda:    "prior_kepda_id",
  tujuan:        "tujuan_id",
  sasaran:       "sasaran_id",
  program:       "program_id",
  kegiatan:      "kegiatan_id",
  subKegiatan:   "sub_kegiatan_id",
};

const NESTED_MAP = {
  misi:          "misi",
  priorNasional: "priorNasional",
  priorDaerah:   "priorDaerah",
  priorKepda:    "priorKepda",
  tujuan:        "tujuan",
  sasaran:       "sasaran",
  program:       "program",
  kegiatan:      "kegiatan",
  subKegiatan:   "subKegiatan",
};

const PARENT_QUERY_KEYS = {
  misi:          "misi_id",
  priorNasional: "prioritas_nasional_id",
  priorDaerah:   "prioritas_daerah_id",
  priorKepda:    "prioritas_kepala_daerah_id",
  tujuan:        "tujuan_id",
  sasaran:       "sasaran_id",
  strategi:      "strategi_id",
  program:       "program_id",
  kegiatan:      "kegiatan_id",
};

const GROUP_LABELS = {
  rpjmd:    { label: "RPJMD",            color: "primary" },
  prioritas:{ label: "Prioritas",        color: "warning" },
  program:  { label: "Program / Kegiatan", color: "success" },
};

/**
 * Cabang prioritas (misi → … → priorKepda) dan cabang RPJMD (misi → tujuan → …) paralel.
 * Jangan pakai LEVELS.slice(idx+1) untuk reset — memilih priorKepda akan menghapus Tujuan dsb.
 * Map: saat field X berubah, kosongkan hanya field yang memang turunan X.
 */
const CLEAR_WHEN_CHANGED = {
  misi: [
    "priorNasional", "priorDaerah", "priorKepda",
    "tujuan", "sasaran", "strategi", "arahKebijakan",
    "program", "kegiatan", "subKegiatan",
  ],
  priorNasional: ["priorDaerah", "priorKepda"],
  priorDaerah: ["priorKepda"],
  priorKepda: [],
  tujuan: ["sasaran", "strategi", "arahKebijakan", "program", "kegiatan", "subKegiatan"],
  sasaran: ["strategi", "arahKebijakan", "program", "kegiatan", "subKegiatan"],
  strategi: ["arahKebijakan"],
  arahKebijakan: [],
  program: ["kegiatan", "subKegiatan"],
  kegiatan: ["subKegiatan"],
  subKegiatan: [],
};

// ─── Helper functions ────────────────────────────────────────────────────────

function isMultiField(key) {
  return key === "strategi" || key === "arahKebijakan";
}

function resolveExistingValue(key, existingData) {
  if (!existingData) return isMultiField(key) ? [] : "";

  if (key === "strategi") {
    return (existingData.strategis || []).map((item) => normalizeId(item.id));
  }
  if (key === "arahKebijakan") {
    return (existingData.arahKebijakans || []).map((item) => normalizeId(item.id));
  }

  const nestedName = NESTED_MAP[key];
  const nested = nestedName ? existingData[nestedName] : null;
  if (nested && typeof nested === "object" && nested.id != null && nested.id !== "") {
    return normalizeId(nested.id);
  }

  const fk = FK_MAP[key];
  if (fk && existingData[fk] != null && existingData[fk] !== "") {
    return normalizeId(existingData[fk]);
  }

  return normalizeId(existingData?.[key]?.id ?? existingData?.[`${key}_id`] ?? "");
}

/**
 * Memastikan nilai terpilih (dari FK) ada di daftar opsi.
 * Jika tidak ada, injeksi dari nested object snapshot atau buat opsi sintetis.
 */
function mergeRowsWithSnapshot(levelKey, rows, snapshot) {
  const base = Array.isArray(rows) ? [...rows] : [];
  if (!snapshot) return base;

  // Multi-select: tambah semua baris dari snapshot yang belum ada
  if (levelKey === "strategi") {
    const fromApi = Array.isArray(snapshot.strategis) ? snapshot.strategis : [];
    const ids = new Set(base.map((r) => String(r?.id ?? "")));
    fromApi.forEach((ent) => {
      if (ent?.id == null) return;
      const id = normalizeId(ent.id);
      if (!ids.has(id)) { base.push({ ...ent, id }); ids.add(id); }
    });
    return base;
  }
  if (levelKey === "arahKebijakan") {
    const fromApi = Array.isArray(snapshot.arahKebijakans) ? snapshot.arahKebijakans : [];
    const ids = new Set(base.map((r) => String(r?.id ?? "")));
    fromApi.forEach((ent) => {
      if (ent?.id == null) return;
      const id = normalizeId(ent.id);
      if (!ids.has(id)) { base.push({ ...ent, id }); ids.add(id); }
    });
    return base;
  }

  const selectedId = resolveExistingValue(levelKey, snapshot);
  if (!selectedId) return base;
  if (base.some((r) => r && String(r.id) === String(selectedId))) return base;

  // Coba injeksi dari nested object
  const nk = NESTED_MAP[levelKey];
  const ent = nk ? snapshot[nk] : null;
  if (ent && typeof ent === "object" && ent.id != null) {
    if (String(normalizeId(ent.id)) === String(selectedId)) {
      return [...base, { ...ent, id: normalizeId(ent.id) }];
    }
  }

  // Fallback: injeksi opsi sintetis minimal
  return [...base, { id: normalizeId(selectedId), _synthetic: true }];
}

function getOptionLabel(key, item) {
  if (item?._synthetic) return `[Tersimpan ID: ${item.id}]`;
  switch (key) {
    case "misi":         return `${item.no_misi ?? ""} - ${item.isi_misi ?? ""}`;
    case "priorNasional":{ const u = item.nama_prionas || item.uraian_prionas || ""; const k = item.kode_prionas || ""; return k ? `${k} - ${u}` : u; }
    case "priorDaerah":  { const u = item.nama_prioda  || item.uraian_prioda  || ""; const k = item.kode_prioda  || ""; return k ? `${k} - ${u}` : u; }
    case "priorKepda":   { const u = item.nama_priogub || item.uraian_priogub || ""; const k = item.kode_priogub || ""; return k ? `${k} - ${u}` : u; }
    case "tujuan":       return `${item.no_tujuan ?? ""} - ${item.isi_tujuan ?? ""}`;
    case "sasaran":      return `${item.nomor ?? ""} - ${item.isi_sasaran ?? ""}`;
    case "strategi":     return `${item.kode_strategi ?? ""} - ${item.deskripsi ?? ""}`;
    case "arahKebijakan":return `${item.kode_arah ?? ""} - ${item.nama_arah ?? item.deskripsi ?? ""}`;
    case "program":      return `${item.kode_program ?? ""} - ${item.nama_program ?? ""}`;
    case "kegiatan":     return `${item.kode_kegiatan ?? ""} - ${item.nama_kegiatan ?? ""}`;
    case "subKegiatan":  return `${item.kode_sub_kegiatan ?? ""} - ${item.nama_sub_kegiatan ?? ""}`;
    default:             return item.nama || String(item.id);
  }
}

// ─── Komponen utama ──────────────────────────────────────────────────────────

function CascadingForm({ existingData = null, onSaved = () => {} }) {
  const { user, userReady, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { dokumen, tahun } = useDokumen();
  const { periode_id: periodeAktifId } = usePeriodeAktif();

  const [data,    setData]    = useState({});
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  const isEditMode = Boolean(existingData);
  const abortControllers = useRef({});

  // Selalu ada akses ke periodeAktifId terbaru tanpa perlu masukkan ke deps
  const periodeAktifIdRef = useRef(periodeAktifId);
  useEffect(() => { periodeAktifIdRef.current = periodeAktifId; });

  const baseParams = useMemo(() => ({
    jenis_dokumen: String(dokumen || "").toLowerCase(),
    tahun: String(tahun || ""),
    _ts: Date.now(),
  }), [dokumen, tahun]);

  // ── Helper: fetch satu endpoint dan normalisasi ────────────────────────────
  const fetchOne = useCallback(async (path, params, signal) => {
    try {
      const res = await api.get(path, { params, signal });
      return normalizeListItems(res.data);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return null;
      console.warn(`Gagal fetch ${path}:`, err.message);
      return [];
    }
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // EDIT MODE — fetch semua opsi secara paralel
  // ══════════════════════════════════════════════════════════════════════════
  const initEditMode = useCallback(async (ed) => {
    setGlobalLoading(true);
    setError(null);

    // 1. Pre-set semua nilai terpilih dari existingData
    const selectedValues = {};
    LEVELS.forEach((lv) => {
      selectedValues[lv.key] = resolveExistingValue(lv.key, ed);
    });
    setData(selectedValues);

    const controller = new AbortController();
    abortControllers.current["__edit__"] = controller;
    const sig = controller.signal;

    const bp = { ...baseParams, _ts: Date.now() };

    // 2. Tentukan ID yang dibutuhkan untuk fetch parent-dependent endpoints
    const tujuanId  = ed.tujuan_id  ?? ed.tujuan?.id;
    const programId = ed.program_id ?? ed.program?.id;
    const kegiatanId= ed.kegiatan_id?? ed.kegiatan?.id;
    const sasaranId = ed.sasaran_id ?? ed.sasaran?.id;

    // 3. Jalankan semua fetch secara paralel (no periode_id untuk prioritas)
    const [
      misiRows, priorNasRows, priorDaeRows, priorKepRows,
      tujuanRows, sasaranRows,
      strategiRows, arahRows,
      programRows, kegiatanRows, subKegiatanRows,
    ] = await Promise.all([
      fetchOne("misi",              { ...bp },                                                  sig),
      fetchOne("prioritas-nasional",{ ...bp, ...FETCH_LIMITS["prioritas-nasional"] },          sig),
      fetchOne("prioritas-daerah",  { ...bp, ...FETCH_LIMITS["prioritas-daerah"] },            sig),
      fetchOne("prioritas-gubernur",{ ...bp, ...FETCH_LIMITS["prioritas-gubernur"] },          sig),
      fetchOne("tujuan",            { ...bp, ...FETCH_LIMITS["tujuan"] },                      sig),
      tujuanId
        ? fetchOne(`sasaran/by-tujuan/${tujuanId}`, { ...bp },                                 sig)
        : Promise.resolve([]),
      fetchOne("strategi",          { ...bp, ...FETCH_LIMITS["strategi"],
                                      ...(sasaranId ? { sasaran_id: sasaranId } : {}) },        sig),
      fetchOne("arah-kebijakan",    { ...bp, ...FETCH_LIMITS["arah-kebijakan"] },              sig),
      fetchOne("programs",          { ...bp, ...FETCH_LIMITS["programs"] },                    sig),
      programId
        ? fetchOne("kegiatan",      { ...bp, ...FETCH_LIMITS["kegiatan"], program_id: programId }, sig)
        : Promise.resolve([]),
      kegiatanId
        ? fetchOne("sub-kegiatan",  { ...bp, ...FETCH_LIMITS["sub-kegiatan"], kegiatan_id: kegiatanId }, sig)
        : Promise.resolve([]),
    ]);

    if (controller.signal.aborted) return;

    // 4. Merge dengan snapshot agar nilai terpilih selalu ada di opsi
    const newOptions = {
      misi:          mergeRowsWithSnapshot("misi",          misiRows      ?? [], ed),
      priorNasional: mergeRowsWithSnapshot("priorNasional", priorNasRows  ?? [], ed),
      priorDaerah:   mergeRowsWithSnapshot("priorDaerah",   priorDaeRows  ?? [], ed),
      priorKepda:    mergeRowsWithSnapshot("priorKepda",    priorKepRows  ?? [], ed),
      tujuan:        mergeRowsWithSnapshot("tujuan",        tujuanRows    ?? [], ed),
      sasaran:       mergeRowsWithSnapshot("sasaran",       sasaranRows   ?? [], ed),
      strategi:      mergeRowsWithSnapshot("strategi",      strategiRows  ?? [], ed),
      arahKebijakan: mergeRowsWithSnapshot("arahKebijakan", arahRows      ?? [], ed),
      program:       mergeRowsWithSnapshot("program",       programRows   ?? [], ed),
      kegiatan:      mergeRowsWithSnapshot("kegiatan",      kegiatanRows  ?? [], ed),
      subKegiatan:   mergeRowsWithSnapshot("subKegiatan",   subKegiatanRows ?? [], ed),
    };

    setOptions(newOptions);
    setGlobalLoading(false);
  }, [baseParams, fetchOne]);

  // ══════════════════════════════════════════════════════════════════════════
  // NEW MODE — fetch level pertama, sisanya di-trigger oleh handleChange
  // ══════════════════════════════════════════════════════════════════════════
  const initNewMode = useCallback(async () => {
    setGlobalLoading(true);
    setError(null);

    const emptyData = {};
    LEVELS.forEach((lv) => {
      emptyData[lv.key] = isMultiField(lv.key) ? [] : "";
    });
    setData(emptyData);

    const controller = new AbortController();
    abortControllers.current["__new__"] = controller;
    const sig = controller.signal;

    const rows = await fetchOne("misi", { ...baseParams, _ts: Date.now() }, sig);
    if (controller.signal.aborted) return;
    setOptions({ misi: rows ?? [] });
    setGlobalLoading(false);
  }, [baseParams, fetchOne]);

  // ── fetchChildOptions: dipakai saat pengguna memilih di new mode ──────────
  const fetchChildOptions = useCallback(async (levelKey, parentValue, strategiValue) => {
    const level = LEVELS.find((l) => l.key === levelKey);
    if (!level) return;

    // Abort request sebelumnya untuk level ini
    abortControllers.current[levelKey]?.abort?.();
    const controller = new AbortController();
    abortControllers.current[levelKey] = controller;
    const sig = controller.signal;

    setLoading((prev) => ({ ...prev, [levelKey]: true }));

    const bp = { ...baseParams, _ts: Date.now() };
    let requestPath = level.api;
    let params = { ...bp, ...(FETCH_LIMITS[level.api] || {}) };

    // Sasaran: gunakan endpoint by-tujuan
    if (levelKey === "sasaran" && parentValue) {
      requestPath = `sasaran/by-tujuan/${encodeURIComponent(String(parentValue))}`;
      params = { ...bp };
      // Kirim periode_id ke sasaran/by-tujuan (backend punya fallback)
      const pid = Number(periodeAktifIdRef.current);
      if (Number.isFinite(pid) && pid > 0) params.periode_id = pid;
    } else if (level.paramKey) {
      const pqk = PARENT_QUERY_KEYS[level.paramKey] || `${level.paramKey}_id`;
      if (parentValue) {
        params[pqk] = Array.isArray(parentValue) ? parentValue.join(",") : String(parentValue);
      }
      if (levelKey === "arahKebijakan" && strategiValue) {
        params.strategi_id = Array.isArray(strategiValue) ? strategiValue.join(",") : String(strategiValue);
      }
    }

    const rows = await fetchOne(requestPath, params, sig);
    if (controller.signal.aborted) return;

    setOptions((prev) => ({ ...prev, [levelKey]: rows ?? [] }));
    setLoading((prev) => ({ ...prev, [levelKey]: false }));
  }, [baseParams, fetchOne]);

  // ── Effect: inisialisasi form ─────────────────────────────────────────────
  useEffect(() => {
    if (!dokumen || !tahun) return;

    // Abort semua request yang sedang berjalan
    Object.values(abortControllers.current).forEach((c) => c?.abort?.());
    abortControllers.current = {};

    if (isEditMode && existingData) {
      initEditMode(existingData);
    } else {
      initNewMode();
    }

    return () => {
      Object.values(abortControllers.current).forEach((c) => c?.abort?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dokumen, tahun, existingData?.id ?? (isEditMode ? "edit" : null)]);

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      Object.values(abortControllers.current).forEach((c) => c?.abort?.());
    };
  }, []);

  // ── handleChange: cascade select (new mode) ───────────────────────────────
  const handleChange = useCallback(async (event, levelIndex) => {
    const level = LEVELS[levelIndex];
    const raw = event.target.value;
    const nextValue = isMultiField(level.key)
      ? (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(normalizeId)
      : normalizeId(raw);

    const nextData = { ...data, [level.key]: nextValue };
    const toClear = CLEAR_WHEN_CHANGED[level.key] || [];
    toClear.forEach((lvKey) => {
      nextData[lvKey] = isMultiField(lvKey) ? [] : "";
      abortControllers.current[lvKey]?.abort?.();
    });
    setData(nextData);
    setOptions((prev) => {
      const cleared = { ...prev };
      toClear.forEach((lvKey) => {
        cleared[lvKey] = [];
      });
      return cleared;
    });

    /* Muat ulang opsi tiap level yang punya induk terisi (urutan LEVELS = topo kasar). */
    for (let i = 0; i < LEVELS.length; i++) {
      const childLevel = LEVELS[i];
      if (!childLevel.paramKey) continue;
      const pv = nextData[childLevel.paramKey];
      const hasPv = Array.isArray(pv) ? pv.length > 0 : Boolean(pv);
      if (!hasPv) continue;
      await fetchChildOptions(
        childLevel.key,
        pv,
        childLevel.key === "arahKebijakan" ? nextData.strategi : null,
      );
    }
  }, [data, fetchChildOptions]);

  // ── handleSubmit ──────────────────────────────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitSuccess(null);

    const PAYLOAD_MAP = {
      misi: "misi", priorNasional: "prior_nas", priorDaerah: "prior_daerah",
      priorKepda: "prior_kepda", tujuan: "tujuan", sasaran: "sasaran",
      strategi: "strategi", arahKebijakan: "arah_kebijakan",
      program: "program", kegiatan: "kegiatan", subKegiatan: "sub_kegiatan",
    };

    const payload = {};
    for (const level of LEVELS) {
      const value = data[level.key];
      const mappedKey = PAYLOAD_MAP[level.key] || level.key;
      if (Array.isArray(value)) {
        if (value.length === 0) { setError(`Field ${level.label} wajib dipilih`); return; }
        payload[`${mappedKey}_ids`] = value;
      } else {
        if (!value) { setError(`Field ${level.label} wajib dipilih`); return; }
        payload[`${mappedKey}_id`] = value;
      }
    }
    payload.jenis_dokumen = dokumen;
    payload.tahun = tahun;

    try {
      if (existingData?.id) {
        await api.put(`/cascading/${existingData.id}`, payload);
      } else {
        await api.post("/cascading", payload);
      }
      setSubmitSuccess("Data berhasil disimpan");
      if (!existingData) { setData({}); setOptions({}); }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menyimpan data.");
    }
  };

  // ── Render field ──────────────────────────────────────────────────────────
  const renderField = (level, idx) => {
    const rawValue = data[level.key];
    const value = isMultiField(level.key)
      ? (Array.isArray(rawValue) ? rawValue : [])
      : rawValue ?? "";

    const commonProps = {
      label: level.label,
      fieldKey: level.key,
      value,
      options: options[level.key] || [],
      getOptionLabel,
    };

    if (isMultiField(level.key)) {
      return (
        <CascadingMultiSelectField
          key={level.key}
          {...commonProps}
          isMulti
          onChange={(key, selectedValue) =>
            handleChange({ target: { value: selectedValue } }, idx)
          }
        />
      );
    }
    return (
      <CascadingSelectField
        key={level.key}
        {...commonProps}
        onChange={(event) => handleChange(event, idx)}
        loading={loading[level.key]}
      />
    );
  };

  // ── Guard: auth / dokumen ─────────────────────────────────────────────────
  if (authLoading || !userReady || !user) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <div>Memuat data pengguna...</div>
      </div>
    );
  }
  if (!dokumen || !tahun) {
    return (
      <div className="text-center my-5">
        <Alert variant="warning">Silakan pilih dokumen dan tahun terlebih dahulu.</Alert>
      </div>
    );
  }

  // Kelompokkan level per grup
  const groupedLevels = LEVELS.reduce((acc, lv, idx) => {
    const g = lv.group || "lainnya";
    if (!acc[g]) acc[g] = [];
    acc[g].push({ ...lv, idx });
    return acc;
  }, {});

  const isFormComplete = LEVELS.every((level) => {
    const value = data[level.key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  return (
    <Container className="my-4">
      <Breadcrumb>
        <Breadcrumb.Item onClick={() => navigate("/dashboard")}>Home</Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/rpjmd/cascading-list")}>
          Daftar Cascading
        </Breadcrumb.Item>
        {isEditMode && <Breadcrumb.Item active>Edit Cascading</Breadcrumb.Item>}
        {!isEditMode && <Breadcrumb.Item active>Tambah Cascading</Breadcrumb.Item>}
      </Breadcrumb>

      <Alert variant="info" className="d-flex align-items-center gap-2 py-2">
        <strong>Dokumen:</strong>&nbsp;{String(dokumen || "").toUpperCase()}&nbsp;
        <strong>Tahun:</strong>&nbsp;{tahun}
      </Alert>

      {globalLoading && (
        <div className="text-center my-3">
          <Spinner animation="border" size="sm" className="me-2" />
          <span className="text-muted">Memuat pilihan dropdown…</span>
        </div>
      )}

      <Form onSubmit={handleSubmit}>
        {error         && <Alert variant="danger"  onClose={() => setError(null)} dismissible>{error}</Alert>}
        {submitSuccess && <Alert variant="success" onClose={() => setSubmitSuccess(null)} dismissible>{submitSuccess}</Alert>}

        {/* Render per grup */}
        {Object.entries(groupedLevels).map(([groupKey, groupLevels]) => {
          const gInfo = GROUP_LABELS[groupKey] || { label: groupKey, color: "secondary" };
          return (
            <Card key={groupKey} className="mb-3 shadow-sm">
              <Card.Header className={`bg-${gInfo.color} bg-opacity-10 fw-semibold`}>
                <Badge bg={gInfo.color} className="me-2">{gInfo.label}</Badge>
                {groupKey === "rpjmd"     && "Data RPJMD (Misi, Tujuan, Sasaran, Strategi & Arah Kebijakan)"}
                {groupKey === "prioritas" && "Keterkaitan Prioritas Pembangunan"}
                {groupKey === "program"   && "Program, Kegiatan & Sub Kegiatan OPD"}
              </Card.Header>
              <Card.Body>
                <Row>
                  {groupLevels.map((lv) => (
                    <Col key={lv.key} md={lv.multi ? 12 : 6} className="mb-2">
                      {renderField(lv, lv.idx)}
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          );
        })}

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button variant="secondary" onClick={() => onSaved(false)}>
            Batal
          </Button>
          <Button type="submit" disabled={!isFormComplete}>
            {isEditMode ? "Simpan Perubahan" : "Simpan"}
          </Button>
        </div>
      </Form>
    </Container>
  );
}

export default CascadingForm;
