import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useFormikContext } from "formik";
import debounce from "lodash.debounce";
import StepTemplate from "./StepTemplate";
import {
  createIndikatorProgramBatch,
  fetchIndikatorProgramByProgram,
  fetchProgramsForStep,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import { pickBackendErrorMessage } from "@/utils/mapBackendErrorsToFormik";
import useIndikatorBuilder from "../hooks/useIndikatorBuilder";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "../../components/hooks/useAutoIsiTahunDanTarget";
import { Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { normalizeListItems } from "@/utils/apiResponse";
import {
  extractIndikatorProgramListFromResponseBody,
  mapIndikatorProgramApiRowToWizard,
  hydrateDraftFromIndikatorRow,
  clearIndikatorDraftScalars,
  PROGRAM_EXTRA_DRAFT_KEYS,
  RPJMD_INDIKATOR_DRAFT_KEYS,
  listLooksPersistedFromServer,
} from "./wizardIndikatorStepUtils";

const PROGRAM_DRAFT_CLEAR_KEYS = [
  ...RPJMD_INDIKATOR_DRAFT_KEYS,
  ...PROGRAM_EXTRA_DRAFT_KEYS,
];

function hierarchyFromProgramRow(p) {
  if (!p) return { sasaran_id: "", tujuan_id: "", misi_id: "" };
  const s = p.sasaran ?? p.Sasaran;
  const t = s?.Tujuan ?? s?.tujuan;
  const m = t?.Misi ?? t?.misi;
  return {
    sasaran_id: s?.id ?? p.sasaran_id ?? "",
    tujuan_id: t?.id ?? p.tujuan_id ?? "",
    misi_id: m?.id ?? p.misi_id ?? "",
  };
}

export default function ProgramStep({ options, tabKey, setTabKey, onNext }) {
  const stepKey = "program";
  const { values, setFieldValue, resetForm, errors } = useFormikContext();
  const formRef = React.useRef();
  const programIdRef = useRef(values.program_id);
  programIdRef.current = values.program_id;
  const prevProgramParentRef = useRef(null);

  const [programOptions, setProgramOptions] = useState([]);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const navigate = useNavigate();

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  useEffect(() => {
    if (!values.jenis_dokumen) {
      setFieldValue("jenis_dokumen", "RPJMD");
    }
  }, [values.jenis_dokumen, setFieldValue]);

  useEffect(() => {
    const saved =
      localStorage.getItem("form_rpjmd") ||
      sessionStorage.getItem("form_rpjmd");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([key, val]) => setFieldValue(key, val));
      } catch {
        /* ignore */
      }
    }
  }, [setFieldValue]);

  useEffect(() => {
    if (!values.program_id || !values.jenis_dokumen || !values.tahun) return;

    const stringified = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", stringified);
    sessionStorage.setItem("form_rpjmd", stringified);
  }, [values]);

  useEffect(() => {
    const snap = {
      arah_kebijakan_id: values.arah_kebijakan_id,
      periode_id: values.periode_id,
      tahun: values.tahun,
    };
    const prev = prevProgramParentRef.current;
    if (
      prev != null &&
      (String(prev.arah_kebijakan_id ?? "") !==
        String(snap.arah_kebijakan_id ?? "") ||
        String(prev.periode_id ?? "") !== String(snap.periode_id ?? "") ||
        String(prev.tahun ?? "") !== String(snap.tahun ?? ""))
    ) {
      setFieldValue("program_id", "");
      setProgramOptions([]);
    }
    prevProgramParentRef.current = snap;
  }, [values.arah_kebijakan_id, values.periode_id, values.tahun, setFieldValue]);

  const loadPrograms = useCallback(
    debounce(async () => {
      if (
        !values.arah_kebijakan_id ||
        !values.tahun ||
        !values.jenis_dokumen ||
        !values.periode_id
      ) {
        return;
      }
      try {
        setLoadingProgram(true);
        const jd = String(values.jenis_dokumen || "").trim().toLowerCase();
        const res = await fetchProgramsForStep({
          tahun: values.tahun,
          jenis_dokumen: jd,
          arah_kebijakan_id: values.arah_kebijakan_id,
          periode_id: values.periode_id,
        });
        const rows = normalizeListItems(res.data);
        const mapped = rows.map((p) => {
          const h = hierarchyFromProgramRow(p);
          return {
            value: p.id,
            label: `${p.kode_program} - ${p.nama_program}`,
            kode_program: p.kode_program,
            nama_program: p.nama_program,
            sasaran_id: h.sasaran_id || "",
            misi_id: h.misi_id || "",
            tujuan_id: h.tujuan_id || "",
          };
        });
        setProgramOptions(mapped);

        const selectedId = programIdRef.current;
        const selIdx = mapped.findIndex(
          (p) => String(p.value) === String(selectedId || "")
        );
        const hasSelected = selIdx >= 0;
        if (mapped.length > 0 && !hasSelected) {
          const sel = mapped[0];
          const raw = rows[0];
          const h0 = hierarchyFromProgramRow(raw);
          setFieldValue("program_id", String(sel.value));
          setFieldValue("program_label", sel.label);
          setFieldValue(
            "kode_program",
            raw?.kode_program || sel.kode_program || ""
          );
          setFieldValue(
            "nama_program",
            raw?.nama_program || sel.nama_program || ""
          );
          setFieldValue("tujuan_id", h0.tujuan_id || sel.tujuan_id || null);
          setFieldValue("misi_id", h0.misi_id || sel.misi_id || null);
          setFieldValue(
            "sasaran_id",
            h0.sasaran_id || sel.sasaran_id || values.sasaran_id
          );
        } else if (hasSelected && rows[selIdx]) {
          const h = hierarchyFromProgramRow(rows[selIdx]);
          if (h.misi_id)
            setFieldValue("misi_id", String(h.misi_id));
          if (h.tujuan_id)
            setFieldValue("tujuan_id", String(h.tujuan_id));
          if (h.sasaran_id)
            setFieldValue("sasaran_id", String(h.sasaran_id));
        }
      } catch (err) {
        console.error("Gagal memuat program", err);
        setProgramOptions([]);
      } finally {
        setLoadingProgram(false);
      }
    }, 400),
    [
      values.arah_kebijakan_id,
      values.tahun,
      values.jenis_dokumen,
      values.periode_id,
      setFieldValue,
    ]
  );

  useEffect(() => {
    loadPrograms();
    return () => loadPrograms.cancel();
  }, [loadPrograms]);

  useEffect(() => {
    if (!programOptions.length || !values.program_id) return;

    const selected = programOptions.find(
      (p) => String(p.value) === String(values.program_id)
    );
    if (!selected) return;

    setFieldValue("program_label", selected.label || "");
    setFieldValue("tujuan_id", selected.tujuan_id || null);
    setFieldValue("misi_id", selected.misi_id || null);
    setFieldValue("sasaran_id", selected.sasaran_id || values.sasaran_id);
    const list = values.program;
    if (!Array.isArray(list) || list.length === 0) {
      if (selected.kode_program) {
        setFieldValue("kode_program", selected.kode_program);
      }
      if (selected.nama_program) {
        setFieldValue("nama_program", selected.nama_program);
      }
    }
  }, [
    values.program_id,
    programOptions,
    setFieldValue,
    values.sasaran_id,
    values.program,
  ]);

  useEffect(() => {
    if (!values.program_id || !values.tahun || !values.jenis_dokumen) return;
    let cancelled = false;
    (async () => {
      try {
        const jd = String(values.jenis_dokumen || "").trim().toLowerCase();
        const res = await fetchIndikatorProgramByProgram(
          String(values.program_id),
          {
            tahun: String(values.tahun),
            jenis_dokumen: jd,
          }
        );
        if (cancelled) return;
        const rawRows = extractIndikatorProgramListFromResponseBody(res.data);
        const mapped = rawRows.map((r) => {
          const row = mapIndikatorProgramApiRowToWizard(r);
          const rid = r?.id ?? row?.id;
          if (rid == null || rid === "") return row;
          return { ...row, id: String(rid) };
        });
        setFieldValue("program", mapped);
        if (mapped.length > 0) {
          hydrateDraftFromIndikatorRow(
            mapped[0],
            setFieldValue,
            PROGRAM_EXTRA_DRAFT_KEYS
          );
        } else {
          clearIndikatorDraftScalars(setFieldValue, PROGRAM_DRAFT_CLEAR_KEYS);
        }
      } catch {
        if (!cancelled) {
          setFieldValue("program", []);
          clearIndikatorDraftScalars(setFieldValue, PROGRAM_DRAFT_CLEAR_KEYS);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [values.program_id, values.tahun, values.jenis_dokumen, setFieldValue]);

  const { generateKeteranganFrom } = useIndikatorBuilder({
    values,
    setFieldValue,
    options: options?.penanggungJawab || [],
  });

  useEffect(() => {
    const requiredFields = [
      "tolok_ukur_kinerja",
      "target_kinerja",
      "definisi_operasional",
      "metode_penghitungan",
      "baseline",
    ];
    if (requiredFields.every((f) => values[f])) {
      setFieldValue("keterangan", generateKeteranganFrom(values));
    }
  }, [values, setFieldValue, generateKeteranganFrom]);

  const handleReset = () => {
    resetForm();
    localStorage.removeItem("form_rpjmd");
    sessionStorage.removeItem("form_rpjmd");
    setProgramOptions([]);
  };

  const handleGoToList = () => {
    navigate("/dashboard-rpjmd/indikator-program-list");
  };

  const handleNext = async () => {
    if (!values.program_id) {
      toast.error("Silakan pilih Program terlebih dahulu");
      return;
    }

    if (!values.sasaran_id) {
      toast.error("Program yang dipilih belum memiliki sasaran_id yang valid.");
      return;
    }

    const list = Array.isArray(values.program) ? values.program : [];
    if (list.length === 0) {
      toast.error("Belum ada indikator program yang ditambahkan.");
      return;
    }

    try {
      if (!listLooksPersistedFromServer(list)) {
        const payload = list.map((item) => ({
          ...item,
          program_id: Number(values.program_id),
          sasaran_id: values.sasaran_id ? Number(values.sasaran_id) : null,
          tujuan_id: values.tujuan_id ? Number(values.tujuan_id) : null,
          misi_id: values.misi_id ? Number(values.misi_id) : null,
          jenis_dokumen: values.jenis_dokumen,
          tahun: values.tahun,
        }));

        await createIndikatorProgramBatch(payload);
        toast.success("Data indikator program berhasil disimpan.");
      } else {
        toast.success("Indikator program sudah tersimpan. Melanjutkan wizard.");
      }

      const ctx = {
        misi_id: values.misi_id,
        tujuan_id: values.tujuan_id,
        sasaran_id: values.sasaran_id,
        program_id: values.program_id,
        no_misi: values.no_misi,
        isi_misi: values.isi_misi,
        periode_id: values.periode_id,
        tahun: values.tahun,
        jenis_dokumen: values.jenis_dokumen,
        level_dokumen: values.level_dokumen,
        jenis_iku: values.jenis_iku,
      };
      resetForm({ values: { ...values, ...ctx, program: [] } });
      onNext?.();
    } catch (err) {
      console.error("❌ Gagal menyimpan indikator program:", err.response?.data || err);
      toast.error(
        pickBackendErrorMessage(
          err?.response?.data,
          "Gagal menyimpan data indikator program."
        )
      );
    }
  };

  useEffect(() => {
    if (!Object.keys(errors).length) return;
    const el = formRef.current?.querySelector(
      ".is-invalid, [aria-invalid='true']"
    );
    if (el) el.focus({ preventScroll: true });
  }, [errors]);

  const strategiOptionsForContext = useMemo(() => {
    const base = Array.isArray(options?.strategi) ? options.strategi : [];
    const sid = values.strategi_id;
    if (!sid) return base;
    const idStr = String(sid);
    if (base.some((s) => String(s.id ?? s.value) === idStr)) return base;
    const lbl = (values.strategi_label || "").trim();
    if (!lbl) return base;
    return [
      ...base,
      {
        id: sid,
        value: sid,
        label: lbl,
        deskripsi: lbl,
        kode_strategi: "",
      },
    ];
  }, [options?.strategi, values.strategi_id, values.strategi_label]);

  return (
    <div ref={formRef}>
      {loadingProgram ? (
        <div className="text-center my-3">
          <Spinner animation="border" role="status" />
        </div>
      ) : programOptions.length === 0 ? (
        <div className="text-center text-muted py-2">
          Belum ada program untuk arah kebijakan yang dipilih.
        </div>
      ) : (
        <StepTemplate
          stepKey={stepKey}
          options={{
            ...options,
            program: programOptions,
            strategi: strategiOptionsForContext,
          }}
          stepOptions={programOptions}
          tabKey={tabKey}
          setTabKey={setTabKey}
          onNext={handleNext}
        />
      )}

      <div className="d-flex justify-content-between mt-3">
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleReset}>
            Reset Form
          </Button>
          <Button variant="outline-primary" onClick={handleGoToList}>
            Daftar Indikator Program
          </Button>
        </div>
      </div>
    </div>
  );
}
