// src/components/IndikatorRPJMDForm.jsx

import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  ProgressBar,
  OverlayTrigger,
  Tooltip,
  Form as BootstrapForm,
  Spinner,
  Modal,
} from "react-bootstrap";
import { FaInfoCircle } from "react-icons/fa";
import Select from "react-select";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import toast, { Toaster } from "react-hot-toast";

import MisiStep from "./steps/MisiStep";
import TujuanStep from "./steps/TujuanStep";
import SasaranStep from "./steps/SasaranStep";
import ProgramStep from "./steps/ProgramStep";
import KegiatanStep from "./steps/KegiatanStep";

import api from "../../services/api";
import { LEVEL_DOKUMEN_OPTIONS, JENIS_IKU_OPTIONS } from "@/utils/constants";
import { wizardSchemas } from "../../validations";
import { useDokumen } from "@/hooks/useDokumen";

const JENIS_INDIKATOR_OPTIONS = [
  { value: "Kuantitatif", label: "Kuantitatif" },
  { value: "Kualitatif", label: "Kualitatif" },
];

const steps = [
  { key: "misi", label: "Misi", component: MisiStep },
  { key: "tujuan", label: "Tujuan", component: TujuanStep },
  { key: "sasaran", label: "Sasaran", component: SasaranStep },
  { key: "program", label: "Program", component: ProgramStep },
  { key: "kegiatan", label: "Kegiatan", component: KegiatanStep },
];

const IndikatorRPJMD = () => {
  const { dokumen, tahun } = useDokumen();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({
    misi: [],
    tujuan: [],
    penanggungJawab: [],
  });

  const initialValues = {
    level_dokumen: "RPJMD",
    jenis_iku: "IKU",
    tujuan_id: "",
    misi_id: "",
    sasaran_id: "",
    program_id: "",
    kegiatan_id: "",
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
    misi: [],
    tujuan: [],
    sasaran: [],
    program: [],
    kegiatan: [],
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!dokumen || !tahun) return;

      try {
        const defaultParams = {
          jenis_dokumen: dokumen,
          tahun,
        };

        const [misiRes, tujuanRes, opdRes, sasRes, progRes, kegRes] =
          await Promise.all([
            api.get("/misi", { params: defaultParams }),
            api.get("/tujuan", { params: defaultParams }),
            api.get("/opd-penanggung-jawab", { params: { page: 1 } }),
            api.get("/sasaran", { params: defaultParams }),
            api.get("/programs", { params: defaultParams }),
            api.get("/kegiatan", { params: defaultParams }),
          ]);

        let opdList = opdRes.data.data;
        const totalPages = opdRes.data.meta?.totalPages || 1;
        if (totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              api.get(`/opd-penanggung-jawab?page=${i + 2}`)
            )
          );
          opdList = opdList.concat(...rest.map((r) => r.data.data));
        }

        setOptions({
          misi: misiRes.data.data || misiRes.data,
          tujuan: tujuanRes.data.data || tujuanRes.data,
          penanggungJawab: opdList,
          sasaran: sasRes.data.data || sasRes.data,
          program: progRes.data.data || progRes.data,
          kegiatan: kegRes.data.data || kegRes.data,
        });
      } catch (err) {
        console.error("Gagal load data awal:", err);
        toast.error("Gagal memuat data awal.");
      }
    };

    fetchInitialData();
  }, [dokumen, tahun]);

  const currentStepObj = steps[currentStep];
  if (!currentStepObj) {
    return (
      <div style={{ color: "red" }}>Step tidak ditemukan: {currentStep}</div>
    );
  }

  const handleStepChange = async (nextStep) => {
    const defaultParams = {
      jenis_dokumen: dokumen,
      tahun,
    };

    if (nextStep === 1 && options.tujuan.length === 0) {
      try {
        const tujuanRes = await api.get("/tujuan", { params: defaultParams });
        setOptions((prev) => ({
          ...prev,
          tujuan: Array.isArray(tujuanRes.data)
            ? tujuanRes.data
            : tujuanRes.data.data,
        }));
      } catch (err) {
        console.error("Gagal mengambil data tujuan:", err);
        toast.error("Gagal mengambil data Tujuan.");
        return;
      }
    }

    setCurrentStep(nextStep);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        program_id: values.program_id || null,
        kegiatan_id: values.kegiatan_id || null,
        sasaran_id: values.sasaran_id || null,
        tujuan_id: values.tujuan_id || null,
      };
      await api.post("/indikators", payload);
      toast.success("Data berhasil dikirim!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengirim data!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <Formik
        initialValues={initialValues}
        validationSchema={wizardSchemas[currentStep]}
        onSubmit={handleSubmit}
      >
        {({ values, setFieldValue, validateForm }) => (
          <FormikForm id="formik-form">
            <Card className="p-4 mt-4 shadow">
              <h4>{currentStepObj.label}</h4>
              <ProgressBar
                now={((currentStep + 1) / steps.length) * 100}
                className="mb-4"
                variant="info"
              />

              <currentStepObj.component
                options={options}
                stepOptions={options[currentStepObj.key] || []}
                values={values}
                setFieldValue={setFieldValue}
                tabKey={currentStep}
                setTabKey={setCurrentStep}
                onNext={() => handleStepChange(currentStep + 1)}
              />

              <div className="d-flex justify-content-between mt-4">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setCurrentStep((prev) => Math.max(prev - 1, 0))
                  }
                  disabled={currentStep === 0 || loading}
                >
                  Kembali
                </Button>

                <Button
                  variant="primary"
                  type="button"
                  onClick={() => {
                    validateForm().then((errors) => {
                      if (Object.keys(errors).length === 0) {
                        if (currentStep < steps.length - 1) {
                          handleStepChange(currentStep + 1);
                        } else {
                          document.getElementById("formik-form").dispatchEvent(
                            new Event("submit", {
                              cancelable: true,
                              bubbles: true,
                            })
                          );
                        }
                      } else {
                        toast.error("Periksa kembali isian yang belum valid.");
                      }
                    });
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />{" "}
                      Memproses...
                    </>
                  ) : currentStep === steps.length - 1 ? (
                    "Kirim"
                  ) : (
                    "Lanjut"
                  )}
                </Button>
              </div>
            </Card>

            <Modal show={loading} centered backdrop="static" keyboard={false}>
              <Modal.Body className="text-center py-4">
                <Spinner
                  animation="border"
                  variant="primary"
                  className="mb-3"
                />
                <div>Memproses data, mohon tunggu...</div>
              </Modal.Body>
            </Modal>
          </FormikForm>
        )}
      </Formik>
    </>
  );
};

export default IndikatorRPJMD;
