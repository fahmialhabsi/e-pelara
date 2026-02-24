import React, { useEffect, useState } from "react";
import { useFormikContext } from "formik";
import StepTemplate from "./StepTemplate";
import api from "@/services/api";
import useIndikatorBuilder from "../hooks/useIndikatorBuilder";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "../../components/hooks/useAutoIsiTahunDanTarget";
import { toast } from "react-toastify";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function KegiatanStep({ options, tabKey, setTabKey, onNext }) {
  const stepKey = "kegiatan";
  const { values, setFieldValue, resetForm, validateForm } = useFormikContext();
  const [kegiatanOptions, setKegiatanOptions] = useState([]);
  const navigate = useNavigate();
  const [restored, setRestored] = useState(false);

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  useEffect(() => {
    const saved =
      localStorage.getItem("form_rpjmd") ||
      sessionStorage.getItem("form_rpjmd");

    if (saved) {
      const parsed = JSON.parse(saved);
      Object.entries(parsed).forEach(([key, val]) => {
        setFieldValue(key, val, false);
      });
      console.log("🔍 Initial values after restore:", parsed);
      validateForm().then(() => {
        setRestored(true);
      });
    }
  }, []);

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
  }, [restored, options?.program, values.program_id]);

  useEffect(() => {
    if (values.program_id) {
      const stringified = JSON.stringify(values);
      localStorage.setItem("form_rpjmd", stringified);
      sessionStorage.setItem("form_rpjmd", stringified);
    }
  }, [values]);

  useEffect(() => {
    if (!restored) return;
    const { program_id, tahun, jenis_dokumen, misi_id, tujuan_id, sasaran_id } =
      values;
    if (!program_id || !tahun || !jenis_dokumen) return;

    console.log("📥 Fetching kegiatan dengan:", {
      program_id,
      misi_id,
      tujuan_id,
      sasaran_id,
      tahun,
      jenis_dokumen,
    });

    api
      .get("/kegiatan", {
        params: {
          program_id,
          tahun,
          jenis_dokumen: jenis_dokumen,
        },
      })
      .then((res) => {
        const list = res.data?.data || [];
        const mapped = list.map((k) => ({
          value: String(k.id),
          label: `${k.kode_kegiatan} - ${k.nama_kegiatan}`,
          kode_kegiatan: k.kode_kegiatan,
          nama_kegiatan: k.nama_kegiatan,
          misi_id: k.program?.sasaran?.Tujuan?.Misi?.id ?? null,
          tujuan_id: k.program?.sasaran?.Tujuan?.id ?? null,
          sasaran_id: k.program?.sasaran?.id ?? null,
        }));
        console.log("🧾 Data mentah dari API kegiatan:", list);
        console.log("🧾 Mapped kegiatanOptions:", mapped);
        console.log("✅ kegiatanOptions loaded:", mapped);
        console.log("🧾 Data mentah dari API kegiatan:", list);
        console.log("🧾 Mapped kegiatanOptions:", mapped);
        setKegiatanOptions(mapped);
      })
      .catch((err) => {
        console.error("❌ Gagal memuat kegiatan:", err);
        setKegiatanOptions([]);
      });
  }, [restored, values.program_id, values.tahun, values.jenis_dokumen]);

  useEffect(() => {
    if (!values.kegiatan_id) return;

    console.log("🎯 values.kegiatan_id:", values.kegiatan_id);

    const fetchNextKode = async () => {
      try {
        const response = await api.get(
          `/indikator-kegiatan/${values.kegiatan_id}/next-kode`,
          {
            params: {
              jenis_dokumen: values.jenis_dokumen,
              tahun: values.tahun,
            },
          }
        );
        const { next_kode } = response.data;
        if (next_kode) {
          setFieldValue("kode_indikator", next_kode);
        }
      } catch (err) {
        console.error("❌ Gagal ambil next kode indikator kegiatan:", err);
      }
    };

    fetchNextKode();
  }, [values.kegiatan_id, values.jenis_dokumen, values.tahun, setFieldValue]);

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
  }, [values, setFieldValue]);

  const handleSave = async () => {
    const list = Array.isArray(values.kegiatan) ? values.kegiatan : [];

    console.log("🧪 Formik Values", values);

    if (list.length === 0) {
      toast.error("Belum ada indikator kegiatan yang ditambahkan.");
      return;
    }

    const missing = list.some((it) => !it.indikator_id);
    if (missing) {
      toast.error("Beberapa indikator tidak memiliki indikator_id.");
      return;
    }

    if (!values.misi_id || !values.tujuan_id || !values.sasaran_id) {
      toast.error("Pastikan Misi, Tujuan, dan Sasaran telah dipilih.");
      return;
    }

    console.log("🧪 Formik Values (save):", values);
    console.log("📦 indikator_program_id:", values.indikator_program_id);

    const payload = list.map((item) => ({
      ...item,
      kegiatan_id: values.kegiatan_id,
      program_id: values.program_id,
      indikator_program_id: values.indikator_program_id,
      sasaran_id: values.sasaran_id,
      tujuan_id: values.tujuan_id,
      misi_id: values.misi_id,
      jenis_dokumen: values.jenis_dokumen,
      tahun: values.tahun,
    }));

    try {
      await api.post("/indikator-kegiatan", payload);
      toast.success("Data indikator kegiatan berhasil disimpan.");
      resetForm();
      navigate("/rpjmd/indikator-tujuan-list");
    } catch (err) {
      console.error(
        "❌ Gagal simpan indikator kegiatan:",
        err.response?.data || err
      );
      toast.error("Gagal menyimpan data indikator kegiatan.");
    }
  };

  const handleReset = () => {
    resetForm();
    localStorage.removeItem("form_rpjmd");
    sessionStorage.removeItem("form_rpjmd");
    setKegiatanOptions([]);
  };

  const handleGoToList = () => {
    navigate("/rpjmd/indikator-kegiatan-list");
  };

  return (
    <div>
      <StepTemplate
        stepKey={stepKey}
        options={{ ...options, kegiatan: kegiatanOptions }}
        stepOptions={kegiatanOptions}
        tabKey={tabKey}
        setTabKey={setTabKey}
        onSave={handleSave}
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
