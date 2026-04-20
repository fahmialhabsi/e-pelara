import React, { useEffect, useState, useCallback, useRef } from "react";
import { useFormikContext } from "formik";
import StepTemplate from "./StepTemplate";
import {
  createIndikatorTujuanBatch,
  fetchNextKodeIndikatorTujuan,
  fetchTujuan,
  createTujuan,
  fetchIndikatorTujuanByTujuan,
  fetchTujuanNextNo,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import { pickBackendErrorMessage } from "@/utils/mapBackendErrorsToFormik";
import useIndikatorBuilder from "../hooks/useIndikatorBuilder";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import { Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { sanitizeIndikator } from "@/utils/sanitizeIndikator";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import debounce from "lodash.debounce";
import { normalizeListItems } from "@/utils/apiResponse";
import {
  mapApiIndikatorToListRow,
  clearIndikatorDraftScalars,
  RPJMD_INDIKATOR_DRAFT_KEYS,
  dedupeRpjmdIndikatorDraftRows,
  stripAllPersistedRpjmdIndicatorDrafts,
} from "./wizardIndikatorStepUtils";
import { TIPE_INDIKATOR_MAP } from "@/shared/components/constants/indikatorFields";

/** Baris Preview (`values.tujuan[]`) sering hanya snapshot impor; isian tab Formik ada di `values` / baris preview [0] — gabung sebelum POST. */
function mergeTujuanRowWithWizardForm(formValues, row) {
  const preview0 =
    Array.isArray(formValues.tujuan) && formValues.tujuan.length > 0
      ? formValues.tujuan[0]
      : null;
  const merged = { ...(row || {}) };
  for (const key of RPJMD_INDIKATOR_DRAFT_KEYS) {
    const fromRoot = formValues[key];
    const fromPreview = preview0 && preview0[key] !== undefined ? preview0[key] : undefined;
    if (fromRoot !== undefined) merged[key] = fromRoot;
    else if (
      fromPreview !== undefined &&
      (merged[key] === undefined || merged[key] === null || merged[key] === "")
    ) {
      merged[key] = fromPreview;
    }
  }
  if (formValues.kode_indikator !== undefined) {
    merged.kode_indikator = formValues.kode_indikator;
  }
  if (formValues.nama_indikator !== undefined) {
    merged.nama_indikator = formValues.nama_indikator;
  }
  if (!String(merged.tipe_indikator ?? "").trim()) {
    merged.tipe_indikator = TIPE_INDIKATOR_MAP.tujuan ?? "Impact";
  }
  if (!String(merged.jenis_indikator ?? "").trim()) {
    merged.jenis_indikator = "Kuantitatif";
  }
  return merged;
}

function computeNextNoTujuanLocal(noMisi, tujuanRows) {
  const misiNum = Number(noMisi);
  if (!Number.isFinite(misiNum) || misiNum <= 0) return null;
  let maxIdx = 0;
  const re = new RegExp(`^T${misiNum}-(\\d+)`);
  for (const item of tujuanRows || []) {
    const m = String(item.no_tujuan || "").match(re);
    if (m) maxIdx = Math.max(maxIdx, parseInt(m[1], 10));
  }
  return `T${misiNum}-${String(maxIdx + 1).padStart(2, "0")}`;
}

function syncSelectionFromTujuanItem(item, label, setFieldValue) {
  if (!item) return;
  const id = item.id;
  setFieldValue("tujuan_id", id);
  setFieldValue("no_tujuan", id);
  setFieldValue("tujuan_label", label);
  setFieldValue("label_tujuan", label);
  setFieldValue("isi_tujuan", item.isi_tujuan || "");
}

export default function TujuanStep({ options, tabKey, setTabKey, onNext }) {
  const { values, setFieldValue, resetForm } = useFormikContext();
  const tujuanIdRef = useRef(values.tujuan_id);
  tujuanIdRef.current = values.tujuan_id;
  /** Guard: restore dari localStorage hanya boleh dijalankan SEKALI saat mount.
   *  Tanpa guard ini, setiap kali Formik recreate referensi setFieldValue (misal
   *  setelah batch hydrateDraftFromIndikatorRow), effect ini re-fire dan
   *  stripAllPersistedRpjmdIndicatorDrafts mengosongkan semua field tab form. */
  const didRestoreRef = useRef(false);

  const [filteredTujuanOptions, setFilteredTujuanOptions] = useState([]);
  const [tujuanSourceRows, setTujuanSourceRows] = useState([]);
  const [loadingTujuan, setLoadingTujuan] = useState(false);
  const [addingTujuan, setAddingTujuan] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { periode_id, tahun, loading: loadingPeriode } = usePeriodeAktif();

  useSetPreviewFields(values, setFieldValue);

  const { generateKeteranganFrom } = useIndikatorBuilder({
    values,
    setFieldValue,
    options: options?.penanggungJawab || [],
  });

  useEffect(() => {
    if (periode_id && values.periode_id !== periode_id) {
      setFieldValue("periode_id", periode_id);
    }

    if (tahun && values.tahun !== tahun) {
      setFieldValue("tahun", tahun);
    }

    const jenis = user?.default_jenis_dokumen?.toUpperCase() || "RPJMD";
    if (!values.jenis_dokumen && jenis) {
      setFieldValue("jenis_dokumen", jenis);
    }
  }, [
    periode_id,
    tahun,
    user,
    values.periode_id,
    values.tahun,
    values.jenis_dokumen,
    setFieldValue,
  ]);

  useEffect(() => {
    // Guard: jalankan sekali saja saat mount pertama kali
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;
    const saved =
      localStorage.getItem("form_rpjmd") ||
      sessionStorage.getItem("form_rpjmd");
    if (saved) {
      try {
        const parsed = stripAllPersistedRpjmdIndicatorDrafts(JSON.parse(saved));
        Object.entries(parsed).forEach(([key, val]) => setFieldValue(key, val));
      } catch {
        // abaikan jika JSON corrupt
      }
    }
  }, [setFieldValue]);

  useEffect(() => {
    if (!values.misi_id || !values.jenis_dokumen || !values.tahun) return;
    const stringified = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", stringified);
    sessionStorage.setItem("form_rpjmd", stringified);
  }, [values]);

  useEffect(() => {
    setFieldValue("tujuan_id", "");
    setFieldValue("no_tujuan", "");
    setFieldValue("rpjmd_import_indikator_tujuan_id", "");
    setFilteredTujuanOptions([]);
    setTujuanSourceRows([]);
  }, [values.misi_id, values.periode_id, values.tahun, setFieldValue]);

  useEffect(() => {
    setFieldValue("rpjmd_import_indikator_tujuan_id", "");
  }, [values.tujuan_id, setFieldValue]);

  const fetchTujuanByMisi = useCallback(
    debounce(
      async ({
        misi_id,
        periode_id: activePeriodeId,
        tahun: thn,
        jenis_dokumen,
      }) => {
        if (!misi_id || !activePeriodeId || !thn || !jenis_dokumen) return;

        try {
          setLoadingTujuan(true);
          const res = await fetchTujuan({
            misi_id: Number(misi_id),
            periode_id: Number(activePeriodeId),
            tahun: Number(thn),
            jenis_dokumen: jenis_dokumen?.toUpperCase(),
          });

          const items = normalizeListItems(res.data);
          setTujuanSourceRows(items);

          const tujuanOptions = items.map((item) => ({
            value: item.id,
            label: `${item.no_tujuan} - ${item.isi_tujuan}`,
            isi_tujuan: item.isi_tujuan || "",
          }));

          setFilteredTujuanOptions(tujuanOptions);

          const selectedId = tujuanIdRef.current;
          const hasSelectedOption = tujuanOptions.some(
            (option) => String(option.value) === String(selectedId || "")
          );

          if (tujuanOptions.length > 0 && !hasSelectedOption) {
            const first = items[0];
            const opt0 = tujuanOptions[0];
            syncSelectionFromTujuanItem(first, opt0.label, setFieldValue);
          }
        } catch (err) {
          console.error("Gagal fetch tujuan:", err);
          setFilteredTujuanOptions([]);
          setTujuanSourceRows([]);
        } finally {
          setLoadingTujuan(false);
        }
      },
      500
    ),
    [setFieldValue]
  );

  useEffect(() => {
    const ready =
      values.misi_id &&
      values.periode_id &&
      values.tahun &&
      values.jenis_dokumen;

    if (loadingPeriode) return;

    if (!ready) {
      setFilteredTujuanOptions([]);
      setTujuanSourceRows([]);
      return;
    }

    fetchTujuanByMisi({
      misi_id: values.misi_id,
      periode_id: values.periode_id,
      tahun: values.tahun,
      jenis_dokumen: values.jenis_dokumen,
    });
  }, [
    values.misi_id,
    values.periode_id,
    values.tahun,
    values.jenis_dokumen,
    fetchTujuanByMisi,
    loadingPeriode,
  ]);

  const fetchNextKode = useCallback(
    debounce(async (tujuanId) => {
      if (!tujuanId || isNaN(Number(tujuanId))) {
        setFieldValue("kode_indikator", "");
        return;
      }

      try {
        const res = await fetchNextKodeIndikatorTujuan(tujuanId, {
          tahun: values.tahun,
          jenis_dokumen: values.jenis_dokumen,
        });
        setFieldValue("kode_indikator", res.data?.kode || "");
      } catch (err) {
        console.error("Gagal mengambil kode indikator:", err.message);
        setFieldValue("kode_indikator", "");
      }
    }, 500),
    [setFieldValue, values.tahun, values.jenis_dokumen]
  );

  useEffect(() => {
    return () => {
      fetchTujuanByMisi.cancel();
      fetchNextKode.cancel();
    };
  }, [fetchTujuanByMisi, fetchNextKode]);

  useEffect(() => {
    fetchNextKode(values.tujuan_id);
  }, [values.tujuan_id, fetchNextKode]);

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

  useEffect(() => {
    if (!values.tujuan_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchIndikatorTujuanByTujuan(values.tujuan_id);
        if (cancelled) return;
        const raw = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        const mapped = raw.map(mapApiIndikatorToListRow);
        setFieldValue("tujuan", mapped);
        /* Draft isi dari dropdown Nama Indikator (impor / 3.1 / 2.28), bukan auto baris pertama DB. */
        if (mapped.length === 0) {
          clearIndikatorDraftScalars(setFieldValue);
        }
      } catch {
        if (!cancelled) {
          setFieldValue("tujuan", []);
          clearIndikatorDraftScalars(setFieldValue);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [values.tujuan_id, setFieldValue]);

  const handleNextStep = async () => {
    const tujuanList = dedupeRpjmdIndikatorDraftRows(
      Array.isArray(values.tujuan) ? values.tujuan : [],
      values
    );

    if (!values.misi_id) {
      toast.error("Misi belum dipilih. Silakan pilih misi terlebih dahulu.");
      return;
    }

    if (!values.tujuan_id || tujuanList.length === 0) {
      toast.error("Lengkapi indikator tujuan terlebih dahulu.");
      return;
    }

    if (!values.tahun || !values.jenis_dokumen) {
      toast.error("Jenis dokumen / konteks periode belum lengkap.");
      return;
    }

    try {
      console.log("[DEBUG] form values (TujuanStep submit):", values);
      const cleanedList = tujuanList.map((item) => {
        const merged = mergeTujuanRowWithWizardForm(values, item);
        console.log("[DEBUG] merged row before sanitize:", merged);
        return sanitizeIndikator({
          ...merged,
          misi_id: values.misi_id,
          tujuan_id: values.tujuan_id,
          kode_indikator: merged.kode_indikator ?? values.kode_indikator,
          jenis_dokumen: values.jenis_dokumen,
          tahun: values.tahun,
          periode_id: values.periode_id,
        });
      });

      await createIndikatorTujuanBatch(cleanedList);
      toast.success("Indikator tujuan berhasil disimpan!");

      const ctx = {
        misi_id: values.misi_id,
        tujuan_id: values.tujuan_id,
        no_misi: values.no_misi,
        isi_misi: values.isi_misi,
        periode_id: values.periode_id,
        tahun: values.tahun,
        jenis_dokumen: values.jenis_dokumen,
        level_dokumen: values.level_dokumen,
        jenis_iku: values.jenis_iku,
      };
      resetForm({ values: { ...values, ...ctx, tujuan: [] } });
      onNext?.();
    } catch (err) {
      console.error("Gagal simpan indikator:", err);
      toast.error(
        pickBackendErrorMessage(
          err?.response?.data,
          "Gagal menyimpan indikator tujuan."
        )
      );
    }
  };

  const handleReset = () => {
    if (window.confirm("Apakah Anda yakin ingin mereset formulir?")) {
      resetForm();
      localStorage.removeItem("form_rpjmd");
      sessionStorage.removeItem("form_rpjmd");
      setFilteredTujuanOptions([]);
      setTujuanSourceRows([]);
    }
  };

  const handleGoToIndikatorList = () => {
    navigate("/dashboard-rpjmd/indikator-tujuan-list");
  };

  /** Tambah tujuan: tetap Step + tab yang sama; buat baris tujuan di server lalu pilih & kosongkan draft indikator. */
  const handleTambahTujuanSameStep = async () => {
    if (!values.misi_id) {
      toast.error("Misi belum dipilih.");
      return;
    }
    if (!values.periode_id || !values.tahun || !values.jenis_dokumen) {
      toast.error("Periode, tahun, atau jenis dokumen belum lengkap.");
      return;
    }

    setAddingTujuan(true);
    try {
      let nextNo;
      try {
        const r = await fetchTujuanNextNo({
          misi_id: values.misi_id,
          jenis_dokumen: values.jenis_dokumen,
          tahun: values.tahun,
        });
        nextNo = r.data?.no_tujuan;
      } catch {
        nextNo = null;
      }
      if (!nextNo) {
        nextNo =
          computeNextNoTujuanLocal(values.no_misi, tujuanSourceRows) ||
          `T${Number(values.no_misi) || 1}-01`;
      }

      const res = await createTujuan({
        rpjmd_id: values.periode_id,
        misi_id: values.misi_id,
        no_tujuan: nextNo,
        isi_tujuan:
          "[Draft] Uraian tujuan — lengkapi nanti dari menu master / pengelolaan tujuan.",
        jenis_dokumen: values.jenis_dokumen,
        tahun: values.tahun,
      });
      const newItem = res.data?.data || res.data;
      const newId = newItem?.id;
      if (!newId) {
        toast.error("Respons server tidak berisi id tujuan baru.");
        return;
      }

      const label = `${newItem.no_tujuan || nextNo} - ${newItem.isi_tujuan || ""}`;
      const newOpt = {
        value: newId,
        label,
        isi_tujuan: newItem.isi_tujuan || "",
      };

      setTujuanSourceRows((prev) => [...prev, newItem]);
      setFilteredTujuanOptions((prev) => [...prev, newOpt]);
      syncSelectionFromTujuanItem(
        { id: newId, isi_tujuan: newItem.isi_tujuan, no_tujuan: newItem.no_tujuan || nextNo },
        label,
        setFieldValue
      );
      setFieldValue("tujuan", []);
      clearIndikatorDraftScalars(setFieldValue);
      toast.success("Tujuan baru siap; lanjutkan isi indikator di tab yang sama.");
    } catch (err) {
      toast.error(
        pickBackendErrorMessage(err?.response?.data, "Gagal menambah tujuan.")
      );
    } finally {
      setAddingTujuan(false);
    }
  };

  return (
    <div>
      {loadingTujuan ? (
        <div className="text-center my-3">
          <Spinner animation="border" role="status" />
        </div>
      ) : filteredTujuanOptions.length === 0 ? (
        <div className="text-center text-muted py-2">
          Belum ada tujuan untuk misi yang dipilih.{" "}
          <span
            className="text-primary"
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => !addingTujuan && handleTambahTujuanSameStep()}
          >
            Tambah sekarang
          </span>
        </div>
      ) : (
        <StepTemplate
          stepKey="tujuan"
          options={{ ...options, tujuan: filteredTujuanOptions }}
          stepOptions={filteredTujuanOptions}
          tabKey={tabKey}
          setTabKey={setTabKey}
          onNext={handleNextStep}
        />
      )}

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleReset}>
            Reset Form
          </Button>
          <Button variant="outline-primary" onClick={handleGoToIndikatorList}>
            Daftar Indikator Tujuan
          </Button>
        </div>
        {values.misi_id && (
          <Button
            size="sm"
            variant="outline-success"
            onClick={() => !addingTujuan && handleTambahTujuanSameStep()}
            disabled={addingTujuan}
          >
            {addingTujuan ? "Menyimpan…" : "+ Tambah Tujuan"}
          </Button>
        )}
      </div>
    </div>
  );
}
