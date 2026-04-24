import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useFormikContext } from "formik";
import debounce from "lodash.debounce";
import StepTemplate from "./StepTemplate";
import {
  createIndikatorProgramBatch,
  fetchIndikatorProgramByProgram,
  fetchProgramsForStep,
  fetchIndikatorArahByArahKebijakan,
  updateIndikatorProgram,
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

function firstPenanggungJawabFromWizardContext(values) {
  const fromRows = (rows) => {
    if (!Array.isArray(rows)) return null;
    for (const r of rows) {
      if (!r || typeof r !== "object") continue;
      const pj = r.penanggung_jawab ?? r.penanggungJawab;
      if (pj != null && String(pj).trim() !== "") return pj;
      const nested = r.opdPenanggungJawab ?? r.opd_penanggung_jawab;
      if (nested && typeof nested === "object" && nested.id != null)
        return nested.id;
    }
    return null;
  };
  return (
    // Scalar di Formik biasanya sudah terisi dari step sebelumnya (Arah Kebijakan).
    values?.penanggung_jawab ??
    values?.arah_kebijakan_penanggung_jawab ??
    fromRows(values?.arah_kebijakan) ??
    fromRows(values?.strategi) ??
    fromRows(values?.tujuan) ??
    null
  );
}

export default function ProgramStep({ options, tabKey, setTabKey, onNext }) {
  const stepKey = "program";
  const { values, setFieldValue, resetForm, errors } = useFormikContext();
  const formRef = React.useRef();
  const loadedSavedOnceRef = useRef(false);
  const programIdRef = useRef(values.program_id);
  programIdRef.current = values.program_id;
  const prevProgramParentRef = useRef(null);

  const [programOptions, setProgramOptions] = useState([]);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [arahIndikatorOptions, setArahIndikatorOptions] = useState([]);
  const [loadingArahIndikator, setLoadingArahIndikator] = useState(false);
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
    // Jangan timpa nilai yang sudah ada dari alur wizard (resetForm antar step).
    // Ini penting agar penanggung_jawab dari step Arah Kebijakan tidak kembali kosong
    // karena localStorage belum tersinkron tepat waktu.
    if (loadedSavedOnceRef.current) return;
    loadedSavedOnceRef.current = true;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([key, val]) => {
          const cur = values?.[key];
          const curEmpty =
            cur == null || (typeof cur === "string" && cur.trim() === "");
          if (!curEmpty) return;
          setFieldValue(key, val);
        });
      } catch {
        /* ignore */
      }
    }
  }, [setFieldValue, values]);

  // Auto isi OPD penanggung jawab di step Program dari konteks Arah Kebijakan,
  // jika pengguna belum memilih OPD secara manual.
  useEffect(() => {
    const cur = values?.penanggung_jawab;
    const curEmpty = cur == null || String(cur).trim() === "";
    if (!curEmpty) return;
    const pj =
      values?.arah_kebijakan_penanggung_jawab != null &&
      String(values.arah_kebijakan_penanggung_jawab).trim() !== ""
        ? String(values.arah_kebijakan_penanggung_jawab)
        : null;
    if (pj) setFieldValue("penanggung_jawab", pj);
  }, [values?.penanggung_jawab, values?.arah_kebijakan_penanggung_jawab, setFieldValue]);

  useEffect(() => {
    if (!values.program_id || !values.jenis_dokumen || !values.tahun) return;

    const stringified = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", stringified);
    sessionStorage.setItem("form_rpjmd", stringified);
  }, [values]);

  useEffect(() => {
    const snap = {
      // Program adalah anak dari Sasaran (lihat pedoman alur RPJMD). Arah kebijakan bersifat optional M2M ke program.
      // Jika dropdown program bergantung pada arah_kebijakan_id, program hasil impor (mis. dari master Kepmendagri)
      // yang belum memiliki relasi program_arah_kebijakan akan "hilang" dari pilihan.
      sasaran_id: values.sasaran_id,
      arah_kebijakan_id: values.arah_kebijakan_id,
      periode_id: values.periode_id,
      tahun: values.tahun,
    };
    const prev = prevProgramParentRef.current;
    if (
      prev != null &&
      (String(prev.sasaran_id ?? "") !== String(snap.sasaran_id ?? "") ||
        String(prev.arah_kebijakan_id ?? "") !==
          String(snap.arah_kebijakan_id ?? "") ||
        String(prev.periode_id ?? "") !== String(snap.periode_id ?? "") ||
        String(prev.tahun ?? "") !== String(snap.tahun ?? ""))
    ) {
      setFieldValue("program_id", "");
      setProgramOptions([]);
    }
    prevProgramParentRef.current = snap;
  }, [values.sasaran_id, values.periode_id, values.tahun, setFieldValue]);

  const loadPrograms = useCallback(
    debounce(async () => {
      if (
        !values.tahun ||
        !values.jenis_dokumen ||
        !values.periode_id ||
        (!values.sasaran_id && !values.arah_kebijakan_id)
      ) {
        return;
      }
      try {
        setLoadingProgram(true);
        const jd = String(values.jenis_dokumen || "").trim().toLowerCase();
        const res = await fetchProgramsForStep({
          tahun: values.tahun,
          jenis_dokumen: jd,
          // Prefer arah_kebijakan_id jika tersedia: alur operator adalah Arah Kebijakan -> Program.
          ...(values.arah_kebijakan_id
            ? { arah_kebijakan_id: values.arah_kebijakan_id }
            : { sasaran_id: values.sasaran_id }),
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
      values.sasaran_id,
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
    // Jangan kosongkan konteks jika backend tidak mengembalikan relasi lengkap untuk dropdown.
    if (selected.tujuan_id) setFieldValue("tujuan_id", selected.tujuan_id);
    if (selected.misi_id) setFieldValue("misi_id", selected.misi_id);
    if (selected.sasaran_id)
      setFieldValue("sasaran_id", selected.sasaran_id);
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
        const pjFallback = firstPenanggungJawabFromWizardContext(values);
        let mapped = rawRows.map((r) => {
          const row = mapIndikatorProgramApiRowToWizard(r);
          const rid = r?.id ?? row?.id;
          if (rid == null || rid === "") return row;
          return { ...row, id: String(rid) };
        });

        // Samakan pola ArahKebijakanStep: jika PJ baris kosong, isi dari konteks wizard (arah/strategi/tujuan).
        if (pjFallback != null && String(pjFallback).trim() !== "") {
          const pj = String(pjFallback).trim();
          mapped = mapped.map((it) => {
            if (!it || typeof it !== "object") return it;
            const cur = it.penanggung_jawab ?? it.penanggungJawab;
            const empty = cur == null || String(cur).trim() === "";
            return empty ? { ...it, penanggung_jawab: pj } : it;
          });
        }

        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("[ProgramStep] PJ fallback debug", {
            arah_kebijakan_penanggung_jawab: values?.arah_kebijakan_penanggung_jawab,
            penanggung_jawab_before: values?.penanggung_jawab,
            pjFallback,
            first_row_pj: mapped?.[0]?.penanggung_jawab,
          });
        }

        setFieldValue("program", mapped);
        if (mapped.length > 0) {
          hydrateDraftFromIndikatorRow(
            mapped[0],
            setFieldValue,
            PROGRAM_EXTRA_DRAFT_KEYS
          );

          // Pola ArahKebijakanStep: jika penanggung_jawab kosong, isi dari konteks wizard (arah/strategi/tujuan).
          // Letakkan setelah hydrate agar nilai hydrate tidak menimpa fallback.
          if (pjFallback != null && String(pjFallback).trim() !== "") {
            const cur = values?.penanggung_jawab;
            const empty = cur == null || String(cur).trim() === "";
            if (empty) {
              setFieldValue("penanggung_jawab", String(pjFallback));
            }
          }

          // Jika API mengembalikan baris "referensi" (program_id NULL) untuk kompatibilitas legacy,
          // jangan pakai kode_indikator ST... sebagai kode indikator Program.
          // Tetap gunakan sebagai referensi konten (nama/uraian), tetapi kode di-generate dari AR... -> IP-...
          const fk = mapped[0]?.program_id ?? rawRows?.[0]?.program_id;
          const isRef =
            fk == null || String(fk).trim() === "" || String(fk) === "null";
          if (isRef) {
            setFieldValue("kode_indikator", "");
            // Auto isi OPD penanggung jawab dari konteks arah kebijakan jika masih kosong.
            const pjFromArah =
              values?.arah_kebijakan_penanggung_jawab != null &&
              String(values.arah_kebijakan_penanggung_jawab).trim() !== ""
                ? String(values.arah_kebijakan_penanggung_jawab)
                : "";
            if (
              pjFromArah &&
              (values?.penanggung_jawab == null ||
                String(values.penanggung_jawab).trim() === "")
            ) {
              setFieldValue("penanggung_jawab", pjFromArah);
            }
            // Agar preview sync (baseline/pj) bisa match draft yang memakai kode IP-...,
            // kosongkan juga kode pada baris list (dedupeKey akan fallback ke ctx kode_indikator).
            const next = [...mapped];
            next[0] = { ...next[0], kode_indikator: "" };
            setFieldValue("program", next);
          }
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

  // Step Program: opsi indikator arah kebijakan (kode AR...) sebagai basis pembentukan kode indikator program (IP-...).
  useEffect(() => {
    if (!values.arah_kebijakan_id || !values.tahun) {
      setArahIndikatorOptions([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingArahIndikator(true);
        const res = await fetchIndikatorArahByArahKebijakan(
          String(values.arah_kebijakan_id),
          {
            tahun: values.tahun,
            jenis_dokumen: values.jenis_dokumen,
          }
        );
        if (cancelled) return;
        const rows = normalizeListItems(res.data);
        const opts = rows
          .map((r) => {
            const pj =
              r?.penanggung_jawab ??
              r?.opdPenanggungJawab?.id ??
              r?.opd_penanggung_jawab?.id ??
              "";
            return {
              value: r.kode_indikator,
              label: `${r.kode_indikator} - ${r.nama_indikator}`,
              penanggung_jawab:
                pj != null && String(pj).trim() !== "" ? String(pj) : "",
            };
          })
          .filter((o) => o.value && String(o.value).trim() !== "");
        setArahIndikatorOptions(opts);

        const cur =
          values.program_ref_ar_kode_indikator ||
          values.arah_kebijakan_kode_indikator ||
          "";
        const hasCur =
          cur && opts.some((o) => String(o.value) === String(cur));
        if (!hasCur && opts.length > 0) {
          setFieldValue("program_ref_ar_kode_indikator", opts[0].value);
          setFieldValue("arah_kebijakan_kode_indikator", opts[0].value);
          if (opts[0].penanggung_jawab) {
            setFieldValue("penanggung_jawab", opts[0].penanggung_jawab);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.warn(
            "[ProgramStep] Gagal memuat indikator arah kebijakan:",
            err
          );
          setArahIndikatorOptions([]);
        }
      } finally {
        if (!cancelled) setLoadingArahIndikator(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    values.arah_kebijakan_id,
    values.tahun,
    values.jenis_dokumen,
    values.program_ref_ar_kode_indikator,
    values.arah_kebijakan_kode_indikator,
    setFieldValue,
  ]);

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
      const first = list[0] || {};
      const firstId = first?.id != null ? String(first.id).trim() : "";
      const firstProgramFk = first?.program_id ?? first?.programId;
      const isLegacyRef =
        firstProgramFk == null ||
        String(firstProgramFk).trim() === "" ||
        String(firstProgramFk) === "null";

      // Jika baris yang ada masih legacy (program_id NULL), lakukan UPDATE agar:
      // 1) kode_indikator program menjadi IP-... (bukan ST...),
      // 2) penanggung_jawab & baseline tersimpan,
      // 3) indikator kegiatan yang mengacu ke indikator_program_id tidak kehilangan referensi (id tetap).
      const shouldUpgradeLegacy =
        listLooksPersistedFromServer(list) &&
        isLegacyRef &&
        firstId &&
        /^\d+$/.test(firstId) &&
        values?.kode_indikator &&
        String(values.kode_indikator).trim().startsWith("IP-");

      if (shouldUpgradeLegacy) {
        await updateIndikatorProgram(firstId, {
          ...first,
          program_id: Number(values.program_id),
          sasaran_id: values.sasaran_id ? Number(values.sasaran_id) : null,
          tujuan_id: values.tujuan_id ? Number(values.tujuan_id) : null,
          misi_id: values.misi_id ? Number(values.misi_id) : null,
          jenis_dokumen: values.jenis_dokumen,
          tahun: values.tahun,
          kode_indikator: String(values.kode_indikator).trim(),
          baseline:
            values.baseline != null && String(values.baseline).trim() !== ""
              ? String(values.baseline).trim()
              : first?.baseline ?? null,
          penanggung_jawab:
            values.penanggung_jawab != null &&
            String(values.penanggung_jawab).trim() !== ""
              ? Number(values.penanggung_jawab)
              : first?.penanggung_jawab ?? null,
        });
        toast.success("Data indikator program berhasil disimpan.");
      } else if (!listLooksPersistedFromServer(list)) {
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
      ) : loadingArahIndikator && values.arah_kebijakan_id ? (
        <div className="text-center my-3">
          <Spinner animation="border" role="status" />
          <div className="small text-muted mt-2">
            Memuat indikator arah kebijakan...
          </div>
        </div>
      ) : programOptions.length === 0 ? (
        <div className="text-center text-muted py-2">
          Belum ada program untuk konteks yang dipilih.
        </div>
      ) : (
        <StepTemplate
          stepKey={stepKey}
          options={{
            ...options,
            program: programOptions,
            strategi: strategiOptionsForContext,
            arah_kebijakan_indikator: arahIndikatorOptions,
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
