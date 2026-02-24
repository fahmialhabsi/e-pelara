import React, { useEffect, useState, useCallback } from "react";
import { useFormikContext } from "formik";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import debounce from "lodash.debounce";

import StepTemplate from "./StepTemplate";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";

export default function SasaranStep({ options, tabKey, setTabKey }) {
  const stepKey = "sasaran";
  const { values, setFieldValue, resetForm } = useFormikContext();
  const [sasaranOptions, setSasaranOptions] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { periode_id, tahun } = usePeriodeAktif();

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  // 🔁 Set default dokumen, tahun, dan periode
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

  // 🧠 Load from local storage jika tersedia
  useEffect(() => {
    const saved =
      localStorage.getItem("form_rpjmd") ||
      sessionStorage.getItem("form_rpjmd");
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.entries(parsed).forEach(([key, val]) => setFieldValue(key, val));
    }
  }, [setFieldValue]);

  // 💾 Save form ke storage setiap kali berubah
  useEffect(() => {
    const stringified = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", stringified);
    sessionStorage.setItem("form_rpjmd", stringified);
  }, [values]);

  // 📥 Ambil daftar sasaran
  const fetchSasaran = useCallback(
    debounce(async () => {
      if (
        !values.tujuan_id ||
        !values.periode_id ||
        !values.tahun ||
        !values.jenis_dokumen
      )
        return;

      try {
        const res = await api.get("/indikator-sasaran", {
          params: {
            tujuan_id: values.tujuan_id,
            periode_id: values.periode_id,
            tahun: values.tahun,
            jenis_dokumen: values.jenis_dokumen,
          },
        });

        const list = res.data || [];
        const options = list.map((s) => ({
          value: s.id,
          label: `${s.nomor} - ${s.isi_sasaran}`,
          nomor: s.nomor,
        }));
        setSasaranOptions(options);

        if (options.length > 0 && !values.sasaran_id) {
          setFieldValue("sasaran_id", options[0].value);
        }
      } catch {
        toast.error("Gagal memuat data sasaran");
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
    fetchSasaran();
  }, [fetchSasaran]);

  // 🎯 Auto generate kode indikator dari nomor sasaran
  useEffect(() => {
    const selected = sasaranOptions.find((s) => s.value === values.sasaran_id);
    if (selected?.nomor) {
      setFieldValue("kode_indikator", `${selected.nomor}.01`);
    }
  }, [values.sasaran_id, sasaranOptions, setFieldValue]);

  // ⏱️ Auto set baseline dari capaian tahun ke-5
  useEffect(() => {
    if (values.capaian_tahun_5) {
      setFieldValue("baseline", values.capaian_tahun_5);
    }
  }, [values.capaian_tahun_5, setFieldValue]);

  // 💾 Simpan ke server
  const handleSave = async () => {
    const list = Array.isArray(values[stepKey]) ? values[stepKey] : [];

    // Validasi awal
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
      console.warn("Data tidak valid:", invalidItem);
      return toast.error(
        "Pastikan semua indikator memiliki data wajib dan jenis indikator valid."
      );
    }

    // Susun payload bersih
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
      };
    });

    try {
      await api.post("/indikator-sasaran", payload);
      toast.success("Data indikator sasaran berhasil disimpan.");
      resetForm();
      setTabKey((prev) => prev + 1);
    } catch (err) {
      console.error(
        "❌ Gagal simpan indikator sasaran:",
        err.response?.data || err
      );
      toast.error("Gagal menyimpan data indikator sasaran.");
    }
  };

  const handleReset = () => {
    resetForm();
    localStorage.removeItem("form_rpjmd");
    sessionStorage.removeItem("form_rpjmd");
    setSasaranOptions([]);
  };

  const handleGoToIndikatorList = () => {
    navigate("/rpjmd/indikator-sasaran-list");
  };

  return (
    <div>
      <StepTemplate
        stepKey={stepKey}
        options={{ ...options, sasaran: sasaranOptions }}
        stepOptions={sasaranOptions}
        tabKey={tabKey}
        setTabKey={setTabKey}
        onSave={handleSave}
      />

      <div className="d-flex justify-content-between mt-3">
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleReset}>
            Reset Form
          </Button>
          <Button variant="outline-primary" onClick={handleGoToIndikatorList}>
            Daftar Indikator Sasaran
          </Button>
        </div>
      </div>
    </div>
  );
}
