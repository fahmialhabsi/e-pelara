// ✅ FIXED: IndikatorRPJMDForm.js
import React, { useState, useEffect } from "react";
import { Button, Card, ProgressBar } from "react-bootstrap";
import MisiStep from "./steps/MisiStep";
import TujuanStep from "./steps/TujuanStep";
import SasaranStep from "./steps/SasaranStep";
import ProgramStep from "./steps/ProgramStep";
import KegiatanStep from "./steps/KegiatanStep";
import indikatorStages from "./utils/indikatorStages";
import api from "../../services/api";
import { Formik, Form } from "formik";

const steps = [
  { label: "Misi", component: MisiStep },
  { label: "Tujuan", component: TujuanStep },
  { label: "Sasaran", component: SasaranStep },
  { label: "Program", component: ProgramStep },
  { label: "Kegiatan", component: KegiatanStep },
];

const stepKeys = {
  misi: "misi",
  tujuan: "tujuan",
  sasaran: "sasaran",
  program: "program",
  kegiatan: "kegiatan",
};

const IndikatorRPJMD = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData] = useState({
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
    detailTujuan: [],
    kinerjaRows: indikatorStages.map(() => ({
      tolok_ukur: "",
      target_kinerja: "",
    })),
  });

  const [options, setOptions] = useState({
    misi: [],
    penanggungJawab: [],
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const misiRes = await api.get("/misi");
        const opdPage1 = await api.get("/opd-penanggung-jawab?page=1");
        let opdList = opdPage1.data.data;
        const totalOPDPages = opdPage1.data.meta?.totalPages || 1;

        if (totalOPDPages > 1) {
          const remainingOPDRequests = await Promise.all(
            Array.from({ length: totalOPDPages - 1 }, (_, i) =>
              api.get(`/opd-penanggung-jawab?page=${i + 2}`)
            )
          );
          opdList = opdList.concat(
            ...remainingOPDRequests.map((r) => r.data.data)
          );
        }

        setOptions({
          misi: Array.isArray(misiRes.data) ? misiRes.data : misiRes.data.data,
          penanggungJawab: opdList,
        });
      } catch (error) {
        console.error("Gagal memuat data awal:", error);
      }
    };
    fetchInitialData();
  }, []);

  const CurrentStepComponent = steps[currentStep].component;
  const stepKey = steps[currentStep].label.toLowerCase();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      console.log("Payload:", formData);
      await api.post("/indikators", formData);
      alert("Data berhasil dikirim!");
    } catch (error) {
      console.error(error);
      alert("Gagal mengirim data.");
    }
  };

  return (
    <Formik initialValues={formData} enableReinitialize onSubmit={handleSubmit}>
      {({ values, setFieldValue }) => (
        <Form>
          <Card className="p-4 mt-4 shadow">
            <h4>{steps[currentStep].label}</h4>
            <ProgressBar
              now={((currentStep + 1) / steps.length) * 100}
              className="mb-3"
            />

            <CurrentStepComponent
              options={options}
              stepOptions={options[stepKeys[stepKey]] || []}
              values={values}
              setFieldValue={setFieldValue}
            />

            <div className="d-flex justify-content-between mt-3">
              <Button onClick={handleBack} disabled={currentStep === 0}>
                Kembali
              </Button>
              <Button onClick={handleNext} type="button">
                {currentStep === steps.length - 1 ? "Kirim" : "Lanjut"}
              </Button>
            </div>
          </Card>
        </Form>
      )}
    </Formik>
  );
};

export default IndikatorRPJMD;
