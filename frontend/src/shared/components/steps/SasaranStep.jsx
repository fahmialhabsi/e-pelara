import React, { useEffect, useState, useCallback, useRef } from "react";
import { useFormikContext } from "formik";
import { Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import debounce from "lodash.debounce";

import StepTemplate from "./StepTemplate";
import {
  createIndikatorSasaranBatch,
  createSasaran,
  fetchIndikatorSasaranBySasaran,
  fetchSasaranForStep,
  fetchSasaranNextNomor,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import { pickBackendErrorMessage } from "@/utils/mapBackendErrorsToFormik";
import { useAuth } from "@/hooks/useAuth";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import { normalizeListItems } from "@/utils/apiResponse";
import {
  mapApiIndikatorToListRow,
  hydrateDraftFromIndikatorRow,
  clearIndikatorDraftScalars,
} from "./wizardIndikatorStepUtils";

function syncSasaranSelectionFromRow(row, label, setFieldValue) {
  if (!row) return;
  const id = row.id;
  setFieldValue("sasaran_id", id);
  setFieldValue("nomor", id);
  setFieldValue("label_sasaran", label);
  setFieldValue("sasaran_label", label);
  setFieldValue("isi_sasaran", row.isi_sasaran || "");
}

export default function SasaranStep({ options, tabKey, setTabKey, onNext }) {
  const stepKey = "sasaran";
  const { values, setFieldValue, resetForm } = useFormikContext();
  const sasaranIdRef = useRef(values.sasaran_id);
  sasaranIdRef.current = values.sasaran_id;

  const [sasaranOptions, setSasaranOptions] = useState([]);
  const [sasaranSourceRows, setSasaranSourceRows] = useState([]);
  const [loadingSasaran, setLoadingSasaran] = useState(false);
  const [addingSasaran, setAddingSasaran] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { periode_id, tahun } = usePeriodeAktif();

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  useEffect(() => {
    if (periode_id && values.periode_id !== periode_id) {
      setFieldValue("periode_id", periode_id);
    }

    if (tahun) {
      if (!values.tahun) setFieldValue("tahun", tahun);
      if (!values.tahun_awal) setFieldValue("tahun_awal", tahun);
    }

    if (!values.jenis_dokumen && user?.default_jenis_dokumen) {
      setFieldValue("jenis_dokumen", user.default_jenis_dokumen);
    }
  }, [periode_id, tahun, user, values, setFieldValue]);

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
    const stringified = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", stringified);
    sessionStorage.setItem("form_rpjmd", stringified);
  }, [values]);

  useEffect(() => {
    setFieldValue("sasaran_id", "");
    setFieldValue("nomor", "");
    setSasaranOptions([]);
    setSasaranSourceRows([]);
  }, [values.tujuan_id, values.periode_id, values.tahun, setFieldValue]);

  const fetchSasaranByTujuan = useCallback(
    debounce(async () => {
      if (
        !values.tujuan_id ||
        !values.periode_id ||
        !values.tahun ||
        !values.jenis_dokumen
      ) {
        return;
      }

      try {
        setLoadingSasaran(true);
        const res = await fetchSasaranForStep({
          tujuan_id: values.tujuan_id,
          periode_id: values.periode_id,
          tahun: values.tahun,
          jenis_dokumen: values.jenis_dokumen,
        });

        const items = normalizeListItems(res.data);
        setSasaranSourceRows(items);

        const opts = items.map((s) => ({
          value: s.id,
          label: `${s.nomor} - ${s.isi_sasaran}`,
          nomor: s.nomor,
          isi_sasaran: s.isi_sasaran || "",
          misi_id: s.Tujuan?.misi_id || s.misi_id || "",
          tujuan_id: s.tujuan_id,
        }));
        setSasaranOptions(opts);

        const selectedId = sasaranIdRef.current;
        const hasSelected = opts.some(
          (o) => String(o.value) === String(selectedId || "")
        );

        if (opts.length > 0 && !hasSelected) {
          const first = items[0];
          const opt0 = opts[0];
          syncSasaranSelectionFromRow(first, opt0.label, setFieldValue);
        }
      } catch {
        toast.error("Gagal memuat data sasaran");
        setSasaranOptions([]);
        setSasaranSourceRows([]);
      } finally {
        setLoadingSasaran(false);
      }
    }, 500),
    [
      values.tujuan_id,
      values.periode_id,
      values.tahun,
      values.jenis_dokumen,
      setFieldValue,
    ]
  );

  useEffect(() => {
    fetchSasaranByTujuan();
    return () => fetchSasaranByTujuan.cancel();
  }, [fetchSasaranByTujuan]);

  useEffect(() => {
    const list = values.sasaran;
    if (Array.isArray(list) && list.length > 0) return;

    const selected = sasaranOptions.find(
      (s) => String(s.value) === String(values.sasaran_id || "")
    );
    if (selected?.nomor != null && selected.nomor !== "") {
      setFieldValue("kode_indikator", `${selected.nomor}.01`);
    }
  }, [values.sasaran_id, values.sasaran, sasaranOptions, setFieldValue]);

  useEffect(() => {
    if (values.capaian_tahun_5) {
      setFieldValue("baseline", values.capaian_tahun_5);
    }
  }, [values.capaian_tahun_5, setFieldValue]);

  useEffect(() => {
    if (!values.sasaran_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchIndikatorSasaranBySasaran(values.sasaran_id, {
          tahun: values.tahun,
          jenis_dokumen: values.jenis_dokumen,
        });
        if (cancelled) return;
        const raw = normalizeListItems(res.data);
        const mapped = raw.map(mapApiIndikatorToListRow);
        setFieldValue("sasaran", mapped);
        if (mapped.length > 0) {
          hydrateDraftFromIndikatorRow(mapped[0], setFieldValue);
        } else {
          clearIndikatorDraftScalars(setFieldValue);
        }
      } catch {
        if (!cancelled) {
          setFieldValue("sasaran", []);
          clearIndikatorDraftScalars(setFieldValue);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    values.sasaran_id,
    values.tahun,
    values.jenis_dokumen,
    setFieldValue,
  ]);

  const handleSave = async () => {
    const list = Array.isArray(values[stepKey]) ? values[stepKey] : [];

    if (!values.sasaran_id) {
      return toast.error("Pilih sasaran terlebih dahulu.");
    }

    if (list.length === 0) {
      return toast.error("Belum ada indikator sasaran yang ditambahkan.");
    }

    const requiredFields = [
      "indikator_id",
      "jenis_indikator",
      "nama_indikator",
    ];
    const invalidItem = list.find(
      (item) =>
        requiredFields.some((field) => !item[field]) ||
        !["Kuantitatif", "Kualitatif"].includes(item.jenis_indikator)
    );

    if (invalidItem) {
      return toast.error(
        "Pastikan semua indikator memiliki data wajib dan jenis indikator valid."
      );
    }

    const payload = list.map((item) => {
      const getValue = (key, fallback = "") => item[key] || fallback;

      return {
        indikator_id: getValue("indikator_id"),
        nama_indikator: getValue("nama_indikator"),
        sasaran_id: values.sasaran_id,
        tujuan_id: values.tujuan_id,
        misi_id: values.misi_id,
        jenis_dokumen:
          values.jenis_dokumen || user?.default_jenis_dokumen || "",
        tahun: values.tahun || tahun || "",
        periode_id: values.periode_id || periode_id || "",
        jenis: getValue("jenis"),
        jenis_indikator: getValue("jenis_indikator"),
        satuan: getValue("satuan"),
        target: getValue("target"),
        keterangan: getValue("keterangan"),
        rekomendasi_ai: getValue("rekomendasi_ai"),
        tolok_ukur_kinerja: getValue("tolok_ukur_kinerja"),
        target_kinerja: getValue("target_kinerja"),
        kriteria_kuantitatif: getValue("kriteria_kuantitatif"),
        kriteria_kualitatif: getValue("kriteria_kualitatif"),
        definisi_operasional: getValue("definisi_operasional"),
        metode_penghitungan: getValue("metode_penghitungan"),
        baseline: getValue("baseline"),
        target_tahun_1: getValue("target_tahun_1"),
        target_tahun_2: getValue("target_tahun_2"),
        target_tahun_3: getValue("target_tahun_3"),
        target_tahun_4: getValue("target_tahun_4"),
        target_tahun_5: getValue("target_tahun_5"),
        capaian_tahun_1: getValue("capaian_tahun_1"),
        capaian_tahun_2: getValue("capaian_tahun_2"),
        capaian_tahun_3: getValue("capaian_tahun_3"),
        capaian_tahun_4: getValue("capaian_tahun_4"),
        capaian_tahun_5: getValue("capaian_tahun_5"),
        sumber_data: getValue("sumber_data"),
        penanggung_jawab: getValue("penanggung_jawab"),
        kode_indikator: getValue("kode_indikator", values.kode_indikator),
        tipe_indikator: getValue("tipe_indikator", values.tipe_indikator),
      };
    });

    try {
      await createIndikatorSasaranBatch(payload);
      toast.success("Data indikator sasaran berhasil disimpan.");

      const ctx = {
        misi_id: values.misi_id,
        tujuan_id: values.tujuan_id,
        sasaran_id: values.sasaran_id,
        no_misi: values.no_misi,
        isi_misi: values.isi_misi,
        periode_id: values.periode_id,
        tahun: values.tahun,
        jenis_dokumen: values.jenis_dokumen,
        level_dokumen: values.level_dokumen,
        jenis_iku: values.jenis_iku,
        strategi_id: "",
        strategi_label: "",
        arah_kebijakan_id: "",
        arah_kebijakan_label: "",
      };
      resetForm({ values: { ...values, ...ctx, sasaran: [] } });
      if (typeof onNext === "function") onNext();
      else setTabKey((prev) => prev + 1);
    } catch (err) {
      console.error("❌ Gagal simpan indikator sasaran:", err.response?.data || err);
      toast.error(
        pickBackendErrorMessage(
          err?.response?.data,
          "Gagal menyimpan data indikator sasaran."
        )
      );
    }
  };

  const handleReset = () => {
    resetForm();
    localStorage.removeItem("form_rpjmd");
    sessionStorage.removeItem("form_rpjmd");
    setSasaranOptions([]);
    setSasaranSourceRows([]);
  };

  const handleGoToIndikatorList = () => {
    navigate("/dashboard-rpjmd/indikator-sasaran-list");
  };

  const handleTambahSasaranSameStep = async () => {
    if (!values.tujuan_id) {
      toast.error("Tujuan belum dipilih di langkah sebelumnya.");
      return;
    }
    if (!values.periode_id || !values.tahun || !values.jenis_dokumen) {
      toast.error("Periode, tahun, atau jenis dokumen belum lengkap.");
      return;
    }

    setAddingSasaran(true);
    try {
      let nextNomor;
      try {
        const r = await fetchSasaranNextNomor({
          tujuan_id: values.tujuan_id,
          jenis_dokumen: values.jenis_dokumen,
          tahun: values.tahun,
        });
        nextNomor = r.data?.nextNomor;
      } catch {
        nextNomor = null;
      }
      if (nextNomor == null) {
        const max = sasaranSourceRows.reduce((m, s) => {
          const n = Number(s.nomor);
          return Number.isFinite(n) ? Math.max(m, n) : m;
        }, 0);
        nextNomor = max + 1;
      }

      const res = await createSasaran({
        nomor: nextNomor,
        isi_sasaran:
          "[Draft] Uraian sasaran — lengkapi nanti dari menu master bila perlu.",
        tujuan_id: values.tujuan_id,
        rpjmd_id: values.periode_id,
        jenis_dokumen: values.jenis_dokumen,
        tahun: values.tahun,
      });
      const newItem = res.data?.data || res.data;
      const newId = newItem?.id;
      if (!newId) {
        toast.error("Respons server tidak berisi id sasaran baru.");
        return;
      }

      const label = `${newItem.nomor ?? nextNomor} - ${newItem.isi_sasaran || ""}`;
      const newOpt = {
        value: newId,
        label,
        nomor: newItem.nomor ?? nextNomor,
        isi_sasaran: newItem.isi_sasaran || "",
        misi_id: values.misi_id,
        tujuan_id: values.tujuan_id,
      };

      setSasaranSourceRows((prev) => [...prev, newItem]);
      setSasaranOptions((prev) => [...prev, newOpt]);
      syncSasaranSelectionFromRow(
        {
          id: newId,
          nomor: newItem.nomor ?? nextNomor,
          isi_sasaran: newItem.isi_sasaran,
        },
        label,
        setFieldValue
      );
      setFieldValue("sasaran", []);
      clearIndikatorDraftScalars(setFieldValue);
      toast.success("Sasaran baru siap; lanjutkan isi indikator di tab yang sama.");
    } catch (err) {
      toast.error(
        pickBackendErrorMessage(err?.response?.data, "Gagal menambah sasaran.")
      );
    } finally {
      setAddingSasaran(false);
    }
  };

  return (
    <div>
      {loadingSasaran ? (
        <div className="text-center my-3">
          <Spinner animation="border" role="status" />
        </div>
      ) : sasaranOptions.length === 0 ? (
        <div className="text-center text-muted py-2">
          Belum ada sasaran untuk tujuan yang dipilih.{" "}
          <span
            className="text-primary"
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => !addingSasaran && handleTambahSasaranSameStep()}
          >
            Tambah sekarang
          </span>
        </div>
      ) : (
        <StepTemplate
          stepKey={stepKey}
          options={{ ...options, sasaran: sasaranOptions }}
          stepOptions={sasaranOptions}
          tabKey={tabKey}
          setTabKey={setTabKey}
          onSave={handleSave}
        />
      )}

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleReset}>
            Reset Form
          </Button>
          <Button variant="outline-primary" onClick={handleGoToIndikatorList}>
            Daftar Indikator Sasaran
          </Button>
        </div>
        {values.tujuan_id && (
          <Button
            size="sm"
            variant="outline-success"
            onClick={() => !addingSasaran && handleTambahSasaranSameStep()}
            disabled={addingSasaran}
          >
            {addingSasaran ? "Menyimpan…" : "+ Tambah Sasaran"}
          </Button>
        )}
      </div>
    </div>
  );
}
