// src/components/IndikatorRPJMDForm.jsx  — Redesign profesional (2-column layout)

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button, Modal, Spinner, Form as BootstrapForm } from "react-bootstrap";
import { Formik, Form as FormikForm, useFormikContext } from "formik";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

import MisiStep from "./steps/MisiStep";
import TujuanStep from "./steps/TujuanStep";
import SasaranStep from "./steps/SasaranStep";
import StrategiStep from "./steps/StrategiStep";
import ArahKebijakanStep from "./steps/ArahKebijakanStep";
import ProgramStep from "./steps/ProgramStep";
import KegiatanStep from "./steps/KegiatanStep";
import SubKegiatanStep from "./steps/SubKegiatanStep";

import { wizardSchemas } from "../../validations";
import { useDokumen } from "@/hooks/useDokumen";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import { konteksBannerRows } from "@/utils/planningDokumenUtils";
import { normalizeListItems } from "../../utils/apiResponse";
import {
  buildKegiatanIndikatorPayload,
  validateKegiatanWizardForSubmit,
} from "@/features/rpjmd/services/indikatorRpjmdPayload";
import {
  createIndikatorKegiatanBatch,
  fetchTujuan,
  fetchWizardHierarchyOptions,
  fetchWizardBootstrapContext,
  saveIndikatorSubKegiatanWizard,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import {
  mapBackendErrorsToFormik,
  pickBackendErrorMessage,
} from "@/utils/mapBackendErrorsToFormik";
import IndikatorInputContextSummary from "./steps/indikatorStep/IndikatorInputContextSummary";
import WizardContextPanel from "./WizardContextPanel";

/* ─────────────────────────── config ──────────────────────────── */

const STEP_KEY = "rpjmd_wizard_current_step";

const steps = [
  {
    key: "misi",
    label: "Misi",
    description: "Pilih Misi, Level Dokumen, dan Jenis IKU",
    component: MisiStep,
    icon: "🏛",
  },
  {
    key: "tujuan",
    label: "Tujuan",
    description: "Input indikator untuk Tujuan yang dipilih",
    component: TujuanStep,
    icon: "🎯",
  },
  {
    key: "sasaran",
    label: "Sasaran",
    description: "Input indikator untuk Sasaran",
    component: SasaranStep,
    icon: "📊",
  },
  {
    key: "strategi",
    label: "Strategi",
    description: "Input indikator untuk Strategi",
    component: StrategiStep,
    icon: "🗺️",
  },
  {
    key: "arah_kebijakan",
    label: "Arah Kebijakan",
    description: "Input indikator untuk Arah Kebijakan",
    component: ArahKebijakanStep,
    icon: "🧭",
  },
  {
    key: "program",
    label: "Program",
    description: "Input indikator untuk Program",
    component: ProgramStep,
    icon: "📋",
  },
  {
    key: "kegiatan",
    label: "Kegiatan",
    description: "Input indikator untuk Kegiatan",
    component: KegiatanStep,
    icon: "⚙️",
  },
  {
    key: "sub_kegiatan",
    label: "Sub Kegiatan",
    description: "Input indikator Sub Kegiatan dan kirim semua data",
    component: SubKegiatanStep,
    icon: "📌",
  },
];

/* ──────────────────── Downstream reset util ────────────────── */
const _PARENT_FIELDS = [
  "misi_id",
  "tujuan_id",
  "sasaran_id",
  "strategi_id",
  "arah_kebijakan_id",
  "program_id",
  "kegiatan_id",
];
const _FIELD_STEP = {
  misi_id: 0,
  tujuan_id: 1,
  sasaran_id: 2,
  strategi_id: 3,
  arah_kebijakan_id: 4,
  program_id: 5,
  kegiatan_id: 6,
};
const _CLEAR_FROM = [
  /* 0 misi    */ [
    "tujuan_id",
    "tujuan_label",
    "sasaran_id",
    "sasaran_label",
    "strategi_id",
    "strategi_label",
    "arah_kebijakan_id",
    "arah_kebijakan_label",
    "program_id",
    "program_label",
    "kode_program",
    "kegiatan_id",
    "kegiatan_label",
    "sub_kegiatan_id",
    "sub_kegiatan_label",
  ],
  /* 1 tujuan  */ [
    "sasaran_id",
    "sasaran_label",
    "strategi_id",
    "strategi_label",
    "arah_kebijakan_id",
    "arah_kebijakan_label",
    "program_id",
    "program_label",
    "kode_program",
    "kegiatan_id",
    "kegiatan_label",
    "sub_kegiatan_id",
    "sub_kegiatan_label",
  ],
  /* 2 sasaran */ [
    "strategi_id",
    "strategi_label",
    "arah_kebijakan_id",
    "arah_kebijakan_label",
    "program_id",
    "program_label",
    "kode_program",
    "kegiatan_id",
    "kegiatan_label",
    "sub_kegiatan_id",
    "sub_kegiatan_label",
  ],
  /* 3 strategi*/ [
    "arah_kebijakan_id",
    "arah_kebijakan_label",
    "program_id",
    "program_label",
    "kode_program",
    "kegiatan_id",
    "kegiatan_label",
    "sub_kegiatan_id",
    "sub_kegiatan_label",
  ],
  /* 4 arah_keb*/ [
    "program_id",
    "program_label",
    "kode_program",
    "kegiatan_id",
    "kegiatan_label",
    "sub_kegiatan_id",
    "sub_kegiatan_label",
  ],
  /* 5 program */ [
    "kegiatan_id",
    "kegiatan_label",
    "sub_kegiatan_id",
    "sub_kegiatan_label",
  ],
  /* 6 kegiatan*/ ["sub_kegiatan_id", "sub_kegiatan_label"],
];

function DownstreamResetter({ lockedSteps }) {
  const { values, setFieldValue } = useFormikContext();
  const prevRef = useRef({});

  useEffect(() => {
    const prev = prevRef.current;
    // Snapshot current parent values
    const snap = {};
    _PARENT_FIELDS.forEach((f) => {
      snap[f] = values[f];
    });
    prevRef.current = snap;

    // Skip first render (prev is empty)
    if (Object.keys(prev).length === 0) return;

    // Find highest-level changed parent, clear all below it
    for (let i = 0; i < _PARENT_FIELDS.length; i++) {
      const field = _PARENT_FIELDS[i];
      if (lockedSteps.includes(_FIELD_STEP[field])) continue; // locked = skip
      if (prev[field] !== values[field]) {
        _CLEAR_FROM[i].forEach((f) => setFieldValue(f, ""));
        break; // process only highest changed level
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    values.misi_id,
    values.tujuan_id,
    values.sasaran_id,
    values.strategi_id,
    values.arah_kebijakan_id,
    values.program_id,
    values.kegiatan_id,
  ]);

  return null;
}

/* ──────────────────── LockedStepSummary (sub-komponen) ─────── */
function LockedStepSummary({ stepKey, values }) {
  const LABELS = {
    misi:
      `${values.no_misi || ""} ${values.isi_misi || ""}`.trim() ||
      values.misi_id ||
      "—",
    tujuan: values.tujuan_label || values.tujuan_id || "—",
    sasaran: values.sasaran_label || values.sasaran_id || "—",
    strategi: values.strategi_label || values.strategi_id || "—",
    arah_kebijakan:
      values.arah_kebijakan_label || values.arah_kebijakan_id || "—",
    program: values.program_label || values.program_id || "—",
    kegiatan: values.kegiatan_label || values.kegiatan_id || "—",
  };
  const text = LABELS[stepKey] || "—";
  return (
    <div
      style={{
        padding: "18px 20px",
        background: "#f8f9fa",
        borderRadius: 8,
        border: "1px solid #dee2e6",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#6c757d",
          marginBottom: 6,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        🔒 Context (terkunci)
      </div>
      <div style={{ fontWeight: 600, color: "#495057", fontSize: 14 }}>
        {text}
      </div>
      <div style={{ fontSize: 11, color: "#adb5bd", marginTop: 8 }}>
        Step ini dikunci karena wizard dimulai dari level yang lebih dalam.
      </div>
    </div>
  );
}

/* ──────────────────── AutoSaver (sub-komponen) ──────────────── */
/**
 * Menyimpan form ke localStorage setiap 1.5 s setelah perubahan terakhir.
 * Memberi tahu parent via onSaved() dengan timestamp.
 * Didefinisikan di luar agar tidak recreate saat parent re-render.
 */
function AutoSaver({ values, onSaved }) {
  const prevRef = useRef(null);

  useEffect(() => {
    if (!values.misi_id && !values.jenis_dokumen) return;
    const str = JSON.stringify(values);
    if (str === prevRef.current) return;

    const timer = setTimeout(() => {
      prevRef.current = str;
      try {
        localStorage.setItem("form_rpjmd", str);
        sessionStorage.setItem("form_rpjmd", str);
        onSaved(new Date());
      } catch {
        /* ignore quota error */
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [values, onSaved]);

  return null;
}

/* ──────────────────── StepNavigator (sub-komponen) ─────────── */
function StepNavigator({
  currentStep,
  completedSteps,
  lockedSteps = [],
  loading,
  isSubmitting,
  onNavigate,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: "16px 20px",
        background: "#f8f9fc",
        borderBottom: "1px solid #e9ecef",
        overflowX: "auto",
        gap: 0,
      }}
    >
      {steps.map((s, idx) => {
        const isDone = completedSteps.includes(idx);
        const isActive = idx === currentStep;
        const isLocked = lockedSteps.includes(idx);
        const maxReached = Math.max(currentStep, ...completedSteps, 0);
        const isClickable =
          !isLocked && idx <= maxReached && !loading && !isSubmitting;

        /* colours */
        const circleBg = isLocked
          ? "#6c757d"
          : isActive
            ? "#0d6efd"
            : isDone
              ? "#198754"
              : "#e9ecef";
        const circleClr = isLocked || isActive || isDone ? "#fff" : "#6c757d";
        const labelClr = isLocked
          ? "#adb5bd"
          : isActive
            ? "#0d6efd"
            : isDone
              ? "#198754"
              : "#adb5bd";
        const lineClr = isDone ? "#198754" : "#dee2e6";

        return (
          <React.Fragment key={s.key}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 64,
                cursor: isClickable ? "pointer" : "default",
                opacity: isClickable || isActive ? 1 : 0.55,
                transition: "opacity 0.2s",
              }}
              onClick={() => isClickable && onNavigate(idx)}
              title={
                isLocked
                  ? `🔒 ${s.label} (terkunci)`
                  : isClickable
                    ? `Buka ${s.label}`
                    : ""
              }
            >
              {/* circle */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: circleBg,
                  color: circleClr,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 15,
                  border: `2.5px solid ${isActive ? "#0d6efd" : isDone ? "#198754" : "#dee2e6"}`,
                  boxShadow: isActive
                    ? "0 0 0 4px rgba(13,110,253,.18)"
                    : isDone
                      ? "0 0 0 3px rgba(25,135,84,.12)"
                      : "none",
                  transition: "all 0.25s",
                  userSelect: "none",
                }}
              >
                {isLocked ? "🔒" : isDone && !isActive ? "✓" : s.icon}
              </div>

              {/* label */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  color: labelClr,
                  marginTop: 5,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  letterSpacing: 0.2,
                  transition: "color 0.2s",
                }}
              >
                {s.label}
              </span>
            </div>

            {/* connector */}
            {idx < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2.5,
                  background: lineClr,
                  marginTop: 16,
                  borderRadius: 2,
                  minWidth: 20,
                  transition: "background 0.3s",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ──────────────────── IndikatorRPJMD (main) ─────────────────── */

const IndikatorRPJMD = () => {
  const { dokumen, tahun } = useDokumen();
  const { periode_id, periodeList } = usePeriodeAktif();
  const periodeAktif = periodeList.find(
    (p) => String(p.id) === String(periode_id),
  );
  const wizardKonteksLine = konteksBannerRows(dokumen, tahun, periodeAktif)
    .map((r) => `${r.label}: ${r.value}`)
    .join(" · ");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* ── query param entry point: ?from=strategi&sasaran_id=5 ── */
  const _fromParam = searchParams.get("from");
  const _fromStepIdx = _fromParam
    ? steps.findIndex((s) => s.key === _fromParam)
    : -1;
  const _entryStep = _fromStepIdx >= 0 ? _fromStepIdx : -1;
  /* Step-step yang dikunci (parent dari entry point) */
  const lockedSteps =
    _entryStep > 0 ? Array.from({ length: _entryStep }, (_, i) => i) : [];

  /* ── state ── */
  const [currentStep, setCurrentStep] = useState(() => {
    /* Query param ?from= selalu override localStorage */
    if (_entryStep >= 0) return _entryStep;
    try {
      const v = parseInt(localStorage.getItem(STEP_KEY), 10);
      if (!isNaN(v) && v >= 0 && v < steps.length) {
        /* Guard: jika step > 0 tapi form_rpjmd tidak ada / misi_id kosong,
           berarti data konteks hilang → mulai dari awal */
        if (v > 0) {
          const raw =
            localStorage.getItem("form_rpjmd") ||
            sessionStorage.getItem("form_rpjmd");
          if (!raw) return 0;
          try {
            const parsed = JSON.parse(raw);
            if (!parsed?.misi_id) return 0;
          } catch {
            return 0;
          }
        }
        return v;
      }
    } catch {
      /* ignore */
    }
    return 0;
  });

  const [completedSteps, setCompletedSteps] = useState(() => {
    /* Query param: semua step sebelum entry dianggap completed */
    if (_entryStep > 0) return Array.from({ length: _entryStep }, (_, i) => i);
    try {
      const v = parseInt(localStorage.getItem(STEP_KEY), 10);
      if (!isNaN(v) && v > 0 && v < steps.length) {
        /* Pastikan ada konteks sebelum restore completedSteps */
        const raw =
          localStorage.getItem("form_rpjmd") ||
          sessionStorage.getItem("form_rpjmd");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.misi_id) {
              return Array.from({ length: v }, (_, i) => i);
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const [options, setOptions] = useState({
    misi: [],
    tujuan: [],
    sasaran: [],
    program: [],
    kegiatan: [],
    penanggungJawab: [],
  });

  /* ── persist currentStep ── */
  useEffect(() => {
    localStorage.setItem(STEP_KEY, String(currentStep));
  }, [currentStep]);

  /* ── Phase 2: bootstrap context dari backend jika ada query param ?from= ── */
  const formikRef = useRef(null);

  useEffect(() => {
    if (_entryStep < 0) return; // tidak ada query param → skip

    const params = {};
    [
      "misi_id",
      "tujuan_id",
      "sasaran_id",
      "strategi_id",
      "arah_kebijakan_id",
      "program_id",
      "kegiatan_id",
    ].forEach((k) => {
      const v = searchParams.get(k);
      if (v) params[k] = v;
    });
    if (dokumen) params.jenis_dokumen = dokumen;
    if (tahun) params.tahun = tahun;

    fetchWizardBootstrapContext(_fromParam, params)
      .then((ctx) => {
        if (!ctx || Object.keys(ctx).length === 0) return;
        // 1. Tulis ke localStorage untuk sesi berikutnya
        const existing = (() => {
          try {
            return JSON.parse(localStorage.getItem("form_rpjmd") || "{}");
          } catch {
            return {};
          }
        })();
        const merged = { ...existing, ...ctx };
        localStorage.setItem("form_rpjmd", JSON.stringify(merged));
        sessionStorage.setItem("form_rpjmd", JSON.stringify(merged));
        // 2. Langsung prefill Formik saat ini juga via resetForm
        if (formikRef.current) {
          formikRef.current.resetForm({
            values: { ...formikRef.current.values, ...ctx },
          });
        }
      })
      .catch(() => {
        // Fallback diam — Phase 1 sudah set step & completedSteps
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // hanya saat mount

  /* ── initial data fetch ── */
  useEffect(() => {
    if (!dokumen || !tahun) return;
    fetchWizardHierarchyOptions({ jenis_dokumen: dokumen, tahun })
      .then((loaded) =>
        setOptions({
          misi: loaded.misi,
          tujuan: loaded.tujuan,
          sasaran: loaded.sasaran,
          program: loaded.program,
          kegiatan: loaded.kegiatan,
          penanggungJawab: loaded.penanggungJawab,
        }),
      )
      .catch((err) => {
        console.error("Gagal load data awal:", err);
        toast.error("Gagal memuat data awal.");
      });
  }, [dokumen, tahun]);

  /* ── handlers ── */
  const handleStepChange = useCallback(
    async (nextStep) => {
      if (nextStep === 1 && options.tujuan.length === 0) {
        try {
          const res = await fetchTujuan({ jenis_dokumen: dokumen, tahun });
          setOptions((prev) => ({
            ...prev,
            tujuan: normalizeListItems(res.data),
          }));
        } catch {
          toast.error("Gagal mengambil data Tujuan.");
          return;
        }
      }

      if (nextStep > currentStep) {
        setCompletedSteps((prev) =>
          prev.includes(currentStep) ? prev : [...prev, currentStep],
        );
      }
      setCurrentStep(nextStep);
    },
    [currentStep, dokumen, options.tujuan.length, tahun],
  );

  const handleSaved = useCallback((ts) => setLastSavedAt(ts), []);

  /* ── initialValues ── baca dari localStorage agar wizard bisa resume */
  const _defaultValues = {
    level_dokumen: "RPJMD",
    jenis_iku: "IKU",
    tujuan_id: "",
    misi_id: "",
    sasaran_id: "",
    program_id: "",
    kegiatan_id: "",
    /* label fields untuk sidebar */
    tujuan_label: "",
    sasaran_label: "",
    program_label: "",
    strategi_label: "",
    arah_kebijakan_label: "",
    sub_kegiatan_label: "",
    /* context IDs baru */
    strategi_id: "",
    arah_kebijakan_id: "",
    sub_kegiatan_id: "",
    /* misi fields */
    no_misi: "",
    isi_misi: "",
    /* indikator fields */
    nama_indikator: "",
    kode_indikator: "",
    satuan: "",
    tipe_indikator: "",
    jenis_indikator: "",
    definisi_operasional: "",
    metode_penghitungan: "",
    baseline: "",
    target_tahun_1: "",
    target_tahun_2: "",
    target_tahun_3: "",
    target_tahun_4: "",
    target_tahun_5: "",
    sumber_data: "",
    penanggung_jawab: "",
    keterangan: "",
    /** Baris impor PDF terpilih (tab Indikator tujuan) — untuk dropdown & isi otomatis. */
    rpjmd_import_indikator_tujuan_id: "",
    /** Baris indikator strategi (GET by-strategi) — dropdown Nama Indikator step Strategi. */
    rpjmd_import_indikator_strategi_id: "",
    /* list arrays per step */
    misi: [],
    tujuan: [],
    sasaran: [],
    strategi: [],
    arah_kebijakan: [],
    program: [],
    kegiatan: [],
    sub_kegiatan: [],
  };

  const initialValues = (() => {
    try {
      const raw =
        localStorage.getItem("form_rpjmd") ||
        sessionStorage.getItem("form_rpjmd");
      if (raw) {
        const saved = JSON.parse(raw);
        /* merge: pastikan semua key default tersedia walau data lama belum punya */
        return { ..._defaultValues, ...saved };
      }
    } catch {
      /* ignore parse error */
    }
    return _defaultValues;
  })();

  /* ── submit handler (step terakhir = Sub Kegiatan) ── */
  const handleSubmit = async (
    values,
    { resetForm, setSubmitting, setErrors },
  ) => {
    if (currentStep !== steps.length - 1) {
      setSubmitting(false);
      return;
    }

    // Step terakhir: wajib POST batch indikator sub kegiatan (sebelumnya hanya toast tanpa API).
    try {
      await saveIndikatorSubKegiatanWizard(values);
      toast.success("Semua data indikator RPJMD berhasil disimpan.", {
        duration: 4000,
      });
      await new Promise((resolve) => setTimeout(resolve, 750));
      resetForm();
      localStorage.removeItem("form_rpjmd");
      sessionStorage.removeItem("form_rpjmd");
      localStorage.removeItem(STEP_KEY);
      setCompletedSteps([]);
      setCurrentStep(0);
      setLastSavedAt(null);
      navigate("/dashboard-rpjmd/indikator-sub-kegiatan-list");
    } catch (error) {
      console.error(error);
      const data = error?.response?.data;
      if (data) setErrors(mapBackendErrorsToFormik(data));
      const validationMsg =
        error?.code === "VALIDATION" &&
        typeof error?.message === "string" &&
        error.message.trim()
          ? error.message.trim()
          : "";
      toast.error(
        validationMsg ||
          pickBackendErrorMessage(
            data,
            "Gagal menyelesaikan wizard. Coba lagi.",
          ),
        { duration: 5000 },
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentStepObj = steps[currentStep];
  if (!currentStepObj) {
    return (
      <div className="text-danger p-3">Step tidak ditemukan: {currentStep}</div>
    );
  }

  /* ── render ── */
  return (
    <>
      <Toaster position="top-right" richColors />

      <Formik
        innerRef={formikRef}
        initialValues={initialValues}
        validationSchema={wizardSchemas[currentStep]}
        onSubmit={handleSubmit}
      >
        {({
          values,
          setFieldValue,
          validateForm,
          submitForm,
          isSubmitting,
        }) => (
          <FormikForm id="formik-form">
            {/* Auto-saver: tidak render apapun, hanya efek samping */}
            <AutoSaver values={values} onSaved={handleSaved} />
            {/* Downstream reset: clear child fields saat parent berubah */}
            <DownstreamResetter lockedSteps={lockedSteps} />

            {/* ─── Page title bar ─── */}
            <div
              style={{
                background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                color: "#fff",
                padding: "14px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                borderRadius: 10,
                boxShadow: "0 2px 12px rgba(26,35,126,.18)",
              }}
            >
              <div>
                <div
                  style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.3 }}
                >
                  🏛 Pengisian Indikator Spesifik RPJMD
                </div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
                  Wizard 5 langkah · {wizardKonteksLine}
                </div>
              </div>

              {/* Progres ringkas */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: "#fff",
                  }}
                >
                  {currentStep + 1}
                  <span style={{ fontSize: 14, opacity: 0.65 }}>
                    /{steps.length}
                  </span>
                </div>
                <div style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>
                  {currentStepObj.label}
                </div>
              </div>
            </div>

            {/* ─── 2-column layout ─── */}
            <div
              style={{
                display: "flex",
                gap: 20,
                alignItems: "flex-start",
              }}
            >
              {/* ── LEFT: Context sidebar ── */}
              <WizardContextPanel
                values={values}
                currentStep={currentStep}
                completedSteps={completedSteps}
                lastSavedAt={lastSavedAt}
                dokumen={dokumen}
                tahun={tahun}
              />

              {/* ── RIGHT: Form main area ── */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 2px 16px rgba(0,0,0,.08)",
                    overflow: "hidden",
                    border: "1px solid #e9ecef",
                  }}
                >
                  {/* Step navigator */}
                  <StepNavigator
                    currentStep={currentStep}
                    completedSteps={completedSteps}
                    lockedSteps={lockedSteps}
                    loading={loading}
                    isSubmitting={isSubmitting}
                    onNavigate={handleStepChange}
                  />

                  {/* Step header */}
                  <div
                    style={{
                      padding: "18px 24px 14px",
                      borderBottom: "1px solid #f0f0f0",
                      background: "#fafbff",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span style={{ fontSize: 22 }}>
                        {currentStepObj.icon}
                      </span>
                      <div>
                        <div
                          style={{
                            fontSize: 17,
                            fontWeight: 800,
                            color: "#1a237e",
                            letterSpacing: 0.2,
                          }}
                        >
                          Langkah {currentStep + 1}: {currentStepObj.label}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6c757d",
                            marginTop: 1,
                          }}
                        >
                          {currentStepObj.description}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step content */}
                  <div style={{ padding: "20px 24px" }}>
                    {/* Kegiatan: tampilkan ringkasan sebelum kirim */}
                    {currentStep === steps.length - 2 && (
                      <>
                        <IndikatorInputContextSummary
                          stepKey="kegiatan"
                          values={values}
                          options={options}
                          title="Ringkasan sebelum Kirim (indikator kegiatan)"
                        />
                        <BootstrapForm.Text className="text-muted d-block mb-3">
                          Tombol <strong>Simpan &amp; Lanjut</strong> pada tab
                          Ringkasan menyimpan indikator kegiatan, lalu wizard
                          melanjut ke <strong>Sub Kegiatan</strong>. Tombol{" "}
                          <strong>Lanjut →</strong> di footer hanya berpindah
                          langkah (tanpa simpan ke server).
                        </BootstrapForm.Text>
                      </>
                    )}

                    {lockedSteps.includes(currentStep) ? (
                      <LockedStepSummary
                        stepKey={currentStepObj.key}
                        values={values}
                      />
                    ) : (
                      <currentStepObj.component
                        options={options}
                        stepOptions={options[currentStepObj.key] || []}
                        values={values}
                        setFieldValue={setFieldValue}
                        tabKey={currentStep}
                        setTabKey={setCurrentStep}
                        onNext={() => handleStepChange(currentStep + 1)}
                      />
                    )}
                  </div>

                  {/* ── Footer navigation ── */}
                  <div
                    style={{
                      padding: "14px 24px",
                      borderTop: "1px solid #f0f0f0",
                      background: "#fafbff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {/* Back button */}
                    <Button
                      variant="outline-secondary"
                      style={{ minWidth: 110, fontWeight: 600 }}
                      onClick={() =>
                        setCurrentStep((prev) =>
                          Math.max(prev - 1, _entryStep >= 0 ? _entryStep : 0),
                        )
                      }
                      disabled={
                        currentStep === (_entryStep >= 0 ? _entryStep : 0) ||
                        loading ||
                        isSubmitting
                      }
                    >
                      ← Kembali
                    </Button>

                    {/* Step pills (center info) */}
                    <div
                      style={{
                        fontSize: 11,
                        color: "#adb5bd",
                        textAlign: "center",
                        flex: 1,
                      }}
                    >
                      {completedSteps.length > 0 && (
                        <span style={{ color: "#198754" }}>
                          {completedSteps.length} langkah selesai
                        </span>
                      )}
                    </div>

                    {/* Next / Submit button */}
                    <Button
                      variant={
                        currentStep === steps.length - 1 ? "success" : "primary"
                      }
                      style={{ minWidth: 130, fontWeight: 700 }}
                      type="button"
                      onClick={async () => {
                        const errors = await validateForm();
                        if (Object.keys(errors).length > 0) {
                          toast.error(
                            "Periksa kembali isian yang belum valid.",
                          );
                          setTimeout(() => {
                            const el = document.querySelector(
                              "#formik-form .is-invalid, #formik-form [aria-invalid='true']",
                            );
                            el?.focus({ preventScroll: true });
                          }, 150);
                          return;
                        }
                        if (currentStep < steps.length - 1) {
                          handleStepChange(currentStep + 1);
                        } else {
                          submitForm();
                        }
                      }}
                      disabled={loading || isSubmitting}
                    >
                      {loading || isSubmitting ? (
                        <>
                          <Spinner
                            animation="border"
                            size="sm"
                            className="me-2"
                          />
                          Memproses...
                        </>
                      ) : currentStep === steps.length - 1 ? (
                        "✓ Kirim Semua"
                      ) : (
                        "Lanjut →"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Loading modal overlay ─── */}
            <Modal show={loading} centered backdrop="static" keyboard={false}>
              <Modal.Body
                style={{
                  textAlign: "center",
                  padding: "36px 24px",
                  background: "#fff",
                  borderRadius: 12,
                }}
              >
                <Spinner
                  animation="border"
                  variant="primary"
                  style={{ width: 48, height: 48 }}
                />
                <div
                  style={{ marginTop: 16, fontWeight: 600, color: "#1a237e" }}
                >
                  Menyimpan data…
                </div>
                <div style={{ fontSize: 12, color: "#6c757d", marginTop: 4 }}>
                  Mohon tunggu, jangan tutup halaman ini.
                </div>
              </Modal.Body>
            </Modal>
          </FormikForm>
        )}
      </Formik>
    </>
  );
};

export default IndikatorRPJMD;
