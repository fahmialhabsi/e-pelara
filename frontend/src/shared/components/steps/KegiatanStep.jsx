import React, { useEffect, useState } from "react";
import { useFormikContext } from "formik";
import StepTemplate from "./StepTemplate";
import {
  createIndikatorKegiatanBatch,
  fetchIndikatorKegiatanByKegiatan,
  fetchKegiatanByProgram,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import useIndikatorBuilder from "../hooks/useIndikatorBuilder";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "../../components/hooks/useAutoIsiTahunDanTarget";
import { toast } from "react-toastify";
import { Alert, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { normalizeListItems } from "@/utils/apiResponse";
import {
  buildKegiatanIndikatorPayload,
  validateKegiatanWizardForSubmit,
} from "@/features/rpjmd/services/indikatorRpjmdPayload";
import {
  mapBackendErrorsToFormik,
  pickBackendErrorMessage,
} from "@/utils/mapBackendErrorsToFormik";
import {
  clearIndikatorDraftScalars,
  extractIndikatorKegiatanListFromResponseBody,
  hydrateDraftFromIndikatorRow,
  KEGIATAN_EXTRA_DRAFT_KEYS,
  listLooksPersistedFromServer,
  mapIndikatorKegiatanApiRowToWizard,
  RPJMD_INDIKATOR_DRAFT_KEYS,
} from "./wizardIndikatorStepUtils";

const KEGIATAN_DRAFT_CLEAR_KEYS = [
  ...RPJMD_INDIKATOR_DRAFT_KEYS,
  ...KEGIATAN_EXTRA_DRAFT_KEYS,
];

export default function KegiatanStep({ options, tabKey, setTabKey, onNext }) {
  const stepKey = "kegiatan";
  const { values, setFieldValue, resetForm, validateForm, setErrors } =
    useFormikContext();
  const [kegiatanOptions, setKegiatanOptions] = useState([]);
  const navigate = useNavigate();
  const [restored, setRestored] = useState(false);

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  useEffect(() => {
    const saved =
      localStorage.getItem("form_rpjmd") ||
      sessionStorage.getItem("form_rpjmd");

    if (!saved) {
      setRestored(true);
      return;
    }

    const parsed = JSON.parse(saved);
    Object.entries(parsed).forEach(([key, val]) => {
      setFieldValue(key, val, false);
    });

    validateForm().finally(() => {
      setRestored(true);
    });
  }, [setFieldValue, validateForm]);

  useEffect(() => {
    if (!restored || !values.program_id || !options?.program?.length) return;

    const selected = options.program.find(
      (p) => String(p.value) === String(values.program_id)
    );

    if (selected) {
      setFieldValue("misi_id", selected.misi_id || null);
      setFieldValue("tujuan_id", selected.tujuan_id || null);
      setFieldValue("sasaran_id", selected.sasaran_id || null);
    }
  }, [restored, options?.program, values.program_id, setFieldValue]);

  useEffect(() => {
    if (!values.program_id) return;

    const stringified = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", stringified);
    sessionStorage.setItem("form_rpjmd", stringified);
  }, [values]);

  useEffect(() => {
    if (!restored) return;

    const { program_id, tahun, jenis_dokumen } = values;
    if (!program_id || !tahun || !jenis_dokumen) return;

    const jd = String(jenis_dokumen || "").trim().toLowerCase();
    fetchKegiatanByProgram({
      program_id,
      tahun,
      jenis_dokumen: jd,
    })
      .then((res) => {
        const mapped = normalizeListItems(res.data).map((k) => ({
          value: k.id,
          label: `${k.kode_kegiatan} - ${k.nama_kegiatan}`,
          kode_kegiatan: k.kode_kegiatan,
          nama_kegiatan: k.nama_kegiatan,
          misi_id: k.program?.sasaran?.Tujuan?.Misi?.id ?? null,
          tujuan_id: k.program?.sasaran?.Tujuan?.id ?? null,
          sasaran_id: k.program?.sasaran?.id ?? null,
        }));

        setKegiatanOptions(mapped);
      })
      .catch((err) => {
        console.error("Gagal memuat kegiatan:", err);
        setKegiatanOptions([]);
      });
  }, [restored, values.program_id, values.tahun, values.jenis_dokumen]);

  useEffect(() => {
    if (!restored) return;

    if (!values.kegiatan_id || !values.indikator_program_id) {
      setFieldValue("kegiatan", []);
      clearIndikatorDraftScalars(setFieldValue, KEGIATAN_DRAFT_CLEAR_KEYS);
      return;
    }

    if (!values.tahun || !values.jenis_dokumen) return;

    let cancelled = false;
    (async () => {
      try {
        const jd = String(values.jenis_dokumen || "").trim().toLowerCase();
        const res = await fetchIndikatorKegiatanByKegiatan(
          String(values.kegiatan_id),
          {
            tahun: String(values.tahun),
            jenis_dokumen: jd,
            indikator_program_id: values.indikator_program_id,
          }
        );
        if (cancelled) return;
        const rawRows = extractIndikatorKegiatanListFromResponseBody(res.data);
        const kSel = values.kode_kegiatan || "";
        const nSel = values.nama_kegiatan || "";
        const mapped = rawRows.map((r) => {
          const row = mapIndikatorKegiatanApiRowToWizard(r);
          const rid = r?.id ?? row?.id;
          const base =
            rid == null || rid === ""
              ? row
              : { ...row, id: String(rid), indikator_id: String(rid) };
          return {
            ...base,
            kode_kegiatan: base.kode_kegiatan || kSel,
            nama_kegiatan: base.nama_kegiatan || nSel,
          };
        });
        setFieldValue("kegiatan", mapped);
        if (mapped.length > 0) {
          hydrateDraftFromIndikatorRow(
            mapped[0],
            setFieldValue,
            KEGIATAN_EXTRA_DRAFT_KEYS
          );
        } else {
          clearIndikatorDraftScalars(setFieldValue, KEGIATAN_DRAFT_CLEAR_KEYS);
        }
      } catch {
        if (!cancelled) {
          setFieldValue("kegiatan", []);
          clearIndikatorDraftScalars(setFieldValue, KEGIATAN_DRAFT_CLEAR_KEYS);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    restored,
    values.kegiatan_id,
    values.indikator_program_id,
    values.tahun,
    values.jenis_dokumen,
    values.kode_kegiatan,
    values.nama_kegiatan,
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
    if (requiredFields.every((field) => values[field])) {
      setFieldValue("keterangan", generateKeteranganFrom(values));
    }
  }, [values, setFieldValue, generateKeteranganFrom]);

  /** Simpan batch indikator kegiatan lalu lanjut ke step Sub Kegiatan (sama pola dengan ProgramStep). */
  const handleWizardContinue = async () => {
    const check = validateKegiatanWizardForSubmit(values);
    if (!check.ok) {
      toast.error(check.message);
      return;
    }

    const list = Array.isArray(values.kegiatan) ? values.kegiatan : [];

    try {
      setErrors({});
      if (!listLooksPersistedFromServer(list)) {
        const payload = buildKegiatanIndikatorPayload(values);
        await createIndikatorKegiatanBatch(payload);
        toast.success("Data indikator kegiatan berhasil disimpan.");
      } else {
        toast.success("Indikator kegiatan sudah tersimpan. Melanjutkan wizard.");
      }

      const ctx = {
        misi_id: values.misi_id,
        tujuan_id: values.tujuan_id,
        sasaran_id: values.sasaran_id,
        program_id: values.program_id,
        kegiatan_id: values.kegiatan_id,
        indikator_program_id: values.indikator_program_id,
        no_misi: values.no_misi,
        isi_misi: values.isi_misi,
        periode_id: values.periode_id,
        tahun: values.tahun,
        jenis_dokumen: values.jenis_dokumen,
        level_dokumen: values.level_dokumen,
        jenis_iku: values.jenis_iku,
        tujuan_label: values.tujuan_label,
        sasaran_label: values.sasaran_label,
        program_label: values.program_label,
        strategi_id: values.strategi_id,
        arah_kebijakan_id: values.arah_kebijakan_id,
        strategi_label: values.strategi_label,
        arah_kebijakan_label: values.arah_kebijakan_label,
      };
      const nextValues = { ...values, ...ctx, kegiatan: [] };
      resetForm({ values: nextValues });
      try {
        const str = JSON.stringify(nextValues);
        localStorage.setItem("form_rpjmd", str);
        sessionStorage.setItem("form_rpjmd", str);
      } catch {
        /* ignore quota */
      }
      onNext?.();
    } catch (err) {
      console.error(
        "Gagal simpan indikator kegiatan:",
        err.response?.data || err
      );
      const data = err?.response?.data;
      setErrors(mapBackendErrorsToFormik(data));
      toast.error(
        pickBackendErrorMessage(
          data,
          "Gagal menyimpan data indikator kegiatan."
        )
      );
    }
  };

  const handleReset = () => {
    resetForm();
    localStorage.removeItem("form_rpjmd");
    sessionStorage.removeItem("form_rpjmd");
    setKegiatanOptions([]);
  };

  const handleGoToList = () => {
    navigate("/dashboard-rpjmd/indikator-kegiatan-list");
  };

  return (
    <div>
      <Alert variant="light" className="border small mb-3 py-2">
        Di langkah ini, indikator pada tab <strong>Ringkasan</strong> disimpan ke
        server saat Anda menekan <strong>Simpan &amp; Lanjut</strong>; setelah
        sukses wizard melanjutkan ke langkah <strong>Sub Kegiatan</strong>. Untuk
        membuka daftar indikator kegiatan saja, gunakan tombol di bawah.
      </Alert>
      <StepTemplate
        stepKey={stepKey}
        options={{ ...options, kegiatan: kegiatanOptions }}
        stepOptions={kegiatanOptions}
        tabKey={tabKey}
        setTabKey={setTabKey}
        onNext={handleWizardContinue}
      />

      <div className="d-flex justify-content-between mt-3">
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleReset}>
            Reset Form
          </Button>
          <Button variant="outline-primary" onClick={handleGoToList}>
            Daftar Indikator Kegiatan
          </Button>
        </div>
      </div>
    </div>
  );
}
