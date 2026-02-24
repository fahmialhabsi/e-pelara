import React, { useEffect, useState, useCallback } from "react";
import { useFormikContext } from "formik";
import StepTemplate from "./StepTemplate";
import api from "@/services/api";
import useIndikatorBuilder from "../hooks/useIndikatorBuilder";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import { Button, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { sanitizeIndikator } from "@/utils/sanitizeIndikator";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import debounce from "lodash.debounce";

export default function TujuanStep({ options, tabKey, setTabKey, onNext }) {
  const { values, setFieldValue, resetForm } = useFormikContext();
  const [filteredTujuanOptions, setFilteredTujuanOptions] = useState([]);
  const [loadingTujuan, setLoadingTujuan] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { periode_id, tahun, loading: loadingPeriode } = usePeriodeAktif();

  useSetPreviewFields(values, setFieldValue);
  const penanggungJawabOptions = options?.penanggungJawab || [];

  const { generateKeteranganFrom } = useIndikatorBuilder({
    values,
    setFieldValue,
    options: options?.penanggungJawab || [],
  });

  // Set initial values only once
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
      console.info("ℹ️ jenis_dokumen diset otomatis ke:", jenis);
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
    setFieldValue("tujuan_id", "");
  }, [values.misi_id, values.periode_id, values.tahun]);

  const fetchTujuanByMisi = useCallback(
    debounce(async ({ misi_id, periode_id, tahun, jenis_dokumen }) => {
      if (!misi_id || !periode_id || !tahun || !jenis_dokumen) return;

      try {
        setLoadingTujuan(true);
        const res = await api.get("/tujuan", {
          params: {
            misi_id: Number(misi_id),
            periode_id: Number(periode_id),
            tahun: Number(tahun), // <-- ini penting
            jenis_dokumen: jenis_dokumen?.toUpperCase(),
          },
        });
        console.log("📤 Params fetch tujuan:", {
          misi_id: Number(misi_id),
          periode_id: Number(periode_id),
          tahun: Number(tahun),
          jenis_dokumen: jenis_dokumen?.toUpperCase(),
        });
        console.log("🎯 Data tujuan dari API:", res.data);
        const options = res.data.map((item) => ({
          value: item.id,
          label: `${item.no_tujuan} - ${item.isi_tujuan}`,
        }));

        setFilteredTujuanOptions(options);

        if (options.length > 0 && !values.tujuan_id?.toString().trim()) {
          console.log("✅ Menetapkan tujuan_id:", options[0].value);
          setFieldValue("tujuan_id", options[0].value);
        }
      } catch (err) {
        console.error("❌ Gagal fetch tujuan:", err);
      } finally {
        setLoadingTujuan(false);
      }
    }, 500),
    [setFieldValue, values.tujuan_id]
  );

  useEffect(() => {
    const ready =
      values.misi_id &&
      values.periode_id &&
      values.tahun &&
      values.jenis_dokumen;

    if (loadingPeriode) return;

    if (!ready) {
      // Optional: hanya tampilkan warning kalau `misi_id` sudah dipilih
      if (values.misi_id) {
        console.warn(
          "❗ fetchTujuanByMisi dilewati karena nilai belum lengkap",
          {
            misi_id: values.misi_id,
            periode_id: values.periode_id,
            tahun: values.tahun,
            jenis_dokumen: values.jenis_dokumen,
          }
        );
      }
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

  useEffect(() => {
    console.log("🔍 Formik values changed:", values);
  }, [values]);

  const fetchNextKode = useCallback(
    debounce(async (tujuanId) => {
      if (!tujuanId || isNaN(Number(tujuanId))) {
        setFieldValue("kode_indikator", "");
        return;
      }

      try {
        const res = await api.get(`/indikator-tujuans/${tujuanId}/next-kode`, {
          params: {
            tahun: values.tahun,
            jenis_dokumen: values.jenis_dokumen,
          },
        });
        setFieldValue("kode_indikator", res.data?.kode || "");
      } catch (err) {
        console.error("❌ Gagal mengambil kode indikator:", err.message);
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
  }, [values, setFieldValue]);

  useEffect(() => {
    if (values.capaian_tahun_5) {
      setFieldValue("baseline", values.capaian_tahun_5);
    }
  }, [values.capaian_tahun_5, setFieldValue]);

  const handleNextStep = async () => {
    const tujuanList = Array.isArray(values.tujuan) ? values.tujuan : [];

    if (!values.misi_id) {
      toast.error("Misi belum dipilih. Silakan pilih misi terlebih dahulu.");
      return;
    }

    if (!values.tujuan_id || tujuanList.length === 0) {
      toast.error("Lengkapi indikator tujuan terlebih dahulu.");
      return;
    }

    if (!values.tahun || !values.jenis_dokumen) {
      toast.error("Tahun atau jenis dokumen belum terisi.");
      return;
    }

    try {
      const cleanedList = tujuanList.map((item) =>
        sanitizeIndikator({
          ...item,
          // Override nilai penting di akhir agar tidak tertimpa
          misi_id: values.misi_id,
          tujuan_id: values.tujuan_id,
          kode_indikator: values.kode_indikator,
          jenis_dokumen: values.jenis_dokumen,
          tahun: values.tahun,
          periode_id: values.periode_id,
        })
      );

      console.log("🧹 cleanedList to submit:", cleanedList);
      console.log("🧭 Submit values:", {
        periode_id: values.periode_id,
        misi_id: values.misi_id,
        tujuan_id: values.tujuan_id,
        tahun: values.tahun,
      });

      await api.post("/indikator-tujuans", cleanedList);
      toast.success("Indikator tujuan berhasil disimpan!");
      resetForm();
      onNext?.();
    } catch (err) {
      console.error("❌ Gagal simpan indikator:", err);
      toast.error(
        err?.response?.data?.message || "Gagal menyimpan indikator tujuan."
      );
    }
  };

  const handleReset = () => {
    if (window.confirm("Apakah Anda yakin ingin mereset formulir?")) {
      resetForm();
      localStorage.removeItem("form_rpjmd");
      sessionStorage.removeItem("form_rpjmd");
      setFilteredTujuanOptions([]);
    }
  };

  const handleGoToIndikatorList = () => {
    navigate("/rpjmd/indikator-tujuan-list");
  };

  useEffect(() => {
    const penanggungJawabOptions = options?.penanggungJawab || [];
  }, [options?.penanggungJawab]);

  return (
    <div>
      {loadingTujuan ? (
        <div className="text-center my-3">
          <Spinner animation="border" role="status" />
        </div>
      ) : filteredTujuanOptions.length === 0 ? (
        <div className="text-center text-muted">
          Belum ada tujuan untuk misi yang dipilih.
        </div>
      ) : (
        <StepTemplate
          stepKey="tujuan"
          options={{ ...options, tujuan: filteredTujuanOptions }}
          stepOptions={filteredTujuanOptions}
          tabKey={tabKey}
          setTabKey={setTabKey}
          onNext={handleNextStep}
          opdOptions={options?.penanggungJawab || []}
        />
      )}

      <div className="d-flex justify-content-between mt-3">
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleReset}>
            Reset Form
          </Button>
          <Button variant="outline-primary" onClick={handleGoToIndikatorList}>
            Daftar Indikator Tujuan
          </Button>
        </div>
      </div>
    </div>
  );
}
