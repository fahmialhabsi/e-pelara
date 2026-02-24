// Enhanced ProgramStep.js with reset, navigation, and storage sync
import React, { useEffect, useState } from "react";
import { useFormikContext } from "formik";
import StepTemplate from "./StepTemplate";
import api from "@/services/api";
import useIndikatorBuilder from "../hooks/useIndikatorBuilder";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "../../components/hooks/useAutoIsiTahunDanTarget";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

export default function ProgramStep({ options, tabKey, setTabKey, onNext }) {
  const stepKey = "program";
  const { values, setFieldValue, resetForm, errors } = useFormikContext();
  const formRef = React.useRef();
  const [counter] = useState(1);
  const [programOptions, setProgramOptions] = useState([]);
  const navigate = useNavigate();

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  // Isi default jenis_dokumen jika kosong
  useEffect(() => {
    if (!values.jenis_dokumen) {
      setFieldValue("jenis_dokumen", "RPJMD");
    }
  }, [values.jenis_dokumen, setFieldValue]);

  // Load state dari storage saat mount
  useEffect(() => {
    const saved =
      localStorage.getItem("form_rpjmd") ||
      sessionStorage.getItem("form_rpjmd");
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.entries(parsed).forEach(([key, val]) => setFieldValue(key, val));
    }
  }, [setFieldValue]);

  // Simpan ke storage saat state berubah (validasi minimum dulu)
  useEffect(() => {
    if (!values.program_id || !values.jenis_dokumen || !values.tahun) return;

    const stringified = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", stringified);
    sessionStorage.setItem("form_rpjmd", stringified);
  }, [values]);

  useEffect(() => {
    if (!values.tahun || !values.jenis_dokumen) return;

    api
      .get("/programs", {
        params: {
          tahun: values.tahun,
          jenis_dokumen: values.jenis_dokumen,
        },
      })
      .then((res) => {
        const list = res.data?.data || [];
        const mapped = list.map((p) => ({
          value: String(p.id),
          label: `${p.kode_program} - ${p.nama_program}`,
          kode_program: p.kode_program,
          nama_program: p.nama_program,
          sasaran_id: p.sasaran?.id || "",
          misi_id: p.sasaran?.Tujuan?.Misi?.id || "",
          tujuan_id: p.sasaran?.Tujuan?.id || "",
        }));

        setProgramOptions(mapped);

        const selected = mapped.find(
          (p) => String(p.value) === String(values.program_id)
        );
      })
      .catch((err) => {
        console.error("Gagal memuat program", err);
      });
  }, [values.tahun, values.jenis_dokumen]);

  useEffect(() => {
    if (!programOptions.length || !values.program_id) return;

    const selected = programOptions.find(
      (p) => String(p.value) === String(values.program_id)
    );

    if (!selected) return;

    if (selected.kode_program) {
      setFieldValue(
        "kode_program",
        `${selected.kode_program}.${String(counter).padStart(2, "0")}`
      );
    }

    setFieldValue("tujuan_id", selected.tujuan_id || null);
    setFieldValue("misi_id", selected.misi_id || null);
    setFieldValue("sasaran_id", selected.sasaran_id || null);
  }, [values.program_id, counter, programOptions, setFieldValue]);

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

  const handleReset = () => {
    resetForm();
    localStorage.removeItem("form_rpjmd");
    sessionStorage.removeItem("form_rpjmd");
    setProgramOptions([]);
  };

  const handleGoToList = () => {
    navigate("/rpjmd/indikator-program-list");
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
      const payload = list.map((item) => ({
        ...item,
        program_id: Number(values.program_id),
        sasaran_id: values.sasaran_id ? Number(values.sasaran_id) : null,
        tujuan_id: values.tujuan_id ? Number(values.tujuan_id) : null,
        misi_id: values.misi_id ? Number(values.misi_id) : null,
        jenis_dokumen: values.jenis_dokumen,
        tahun: values.tahun,
      }));

      await api.post("/indikator-program", payload);
      toast.success("Data indikator program berhasil disimpan.");

      // Simpan ulang nilai penting agar tidak hilang setelah reset
      const lastValidData = {
        program_id: values.program_id,
        jenis_dokumen: values.jenis_dokumen,
        tahun: values.tahun,
      };
      localStorage.setItem("form_rpjmd", JSON.stringify(lastValidData));
      sessionStorage.setItem("form_rpjmd", JSON.stringify(lastValidData));

      resetForm();
      onNext?.();
    } catch (err) {
      console.error(
        "❌ Gagal menyimpan indikator program:",
        err.response?.data || err
      );
      toast.error("Gagal menyimpan data indikator program.");
    }
  };

  useEffect(() => {
    if (!Object.keys(errors).length) return;
    const el = formRef.current?.querySelector(
      ".is-invalid, [aria-invalid='true']"
    );
    if (el) el.focus({ preventScroll: true });
  }, [errors]);

  return (
    <div ref={formRef}>
      <StepTemplate
        stepKey={stepKey}
        options={{ ...options, program: programOptions }}
        stepOptions={programOptions}
        tabKey={tabKey}
        setTabKey={setTabKey}
        onNext={handleNext}
      />

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
