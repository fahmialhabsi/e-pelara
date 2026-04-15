import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Alert,
  Container,
  Spinner,
  ProgressBar,
} from "react-bootstrap";
import MisiStep from "../steps/MisiStep";
import TujuanStep from "../steps/TujuanStep";
import SasaranStep from "../steps/SasaranStep";
import ProgramStep from "../steps/ProgramStep";
import KegiatanStep from "../steps/KegiatanStep";
import api from "../../../services/api";
import { useAuth } from "../../../hooks/useAuth";
import { Formik, Form } from "formik";
import { wizardSchemas } from "../../../utils/wizardSchemas";
import { normalizeListItems } from "../../../utils/apiResponse";

const steps = ["Misi", "Tujuan", "Sasaran", "Program", "Kegiatan"];

const stepComponents = [
  MisiStep,
  TujuanStep,
  SasaranStep,
  ProgramStep,
  KegiatanStep,
];

const stepOptionMappings = {
  misi: "misi",
  tujuan: "tujuan",
  sasaran: "tujuan", // SasaranStep butuh data tujuan
  program: "program",
  kegiatan: "kegiatan",
};

export default function IndikatorWizardForm({ onSubmit }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  const [indikatorId, setIndikatorId] = useState(null);
  const [wizardValues, setWizardValues] = useState({
    id: "",
    misi_id: "",
    periode_id: user?.periode_id || "",
    tujuan_id: "",
    sasaran_id: "",
    program_id: "",
    indikator_program_id: "",
    prioritas_nasional_id: "",
    prioritas_daerah_id: "",
    prioritas_gubernur_id: "",
    kegiatan_id: "",
    kode_indikator: "",
    nama_indikator: "",
    satuan: "",
    tipe_indikator: "",
    detailTujuan: [],
    kode_sasaran: "",
    detailSasaran: [],
    penanggung_jawab: "",
    level_dokumen: "RPJMD",
    jenis_iku: "IKU",
    kinerjaRows: [],
  });

  const [options, setOptions] = useState({
    misi: [],
    tujuan: [],
    sasaran: [],
    program: [],
    kegiatan: [],
    penanggungJawab: [],
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r1 = await api.get("/opd-penanggung-jawab?page=1");
        let list = normalizeListItems(r1.data);
        const total = r1.data.meta?.totalPages || 1;

        if (total > 1) {
          const rest = await Promise.all(
            Array.from({ length: total - 1 }, (_, i) =>
              api.get(`/opd-penanggung-jawab?page=${i + 2}`)
            )
          );
          list = list.concat(...rest.map((r) => normalizeListItems(r.data)));
        }

        setOptions((prev) => ({ ...prev, penanggungJawab: list }));
      } catch (err) {
        console.error("Gagal load OPD Penanggung Jawab:", err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [rM, rS, rP, rKpage1] = await Promise.all([
          api.get("/misi"),
          api.get("/sasaran"),
          api.get("/programs"),
          api.get("/kegiatan?page=1"),
        ]);

        let keg = normalizeListItems(rKpage1.data);
        const totalPages = rKpage1.data.meta?.totalPages || 1;
        if (totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              api.get(`/kegiatan?page=${i + 2}`)
            )
          );
          keg = keg.concat(...rest.map((r) => normalizeListItems(r.data)));
        }

        setOptions((prev) => ({
          ...prev,
          misi: normalizeListItems(rM.data),
          sasaran: normalizeListItems(rS.data),
          program: normalizeListItems(rP.data),
          kegiatan: keg,
        }));
      } catch (e) {
        console.error("Gagal memuat opsi dropdown:", e);
        setError("Gagal memuat opsi dropdown");
      }
    })();
  }, []);

  // Perbaikan penting: menyisipkan `sasaran_id` dan `tujuan_id` ke masing-masing row indikator sasaran

  const handleNext = async (values) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const currentStage = steps[step].toLowerCase();

      if (step === 0) {
        const res = await api.post("/indikator-wizard", {
          misi_id: values.misi_id,
          jenis_dokumen: user?.jenis_dokumen,
          tahun: user?.tahun,
          level_dokumen: values.level_dokumen,
          jenis_iku: values.jenis_iku,
          periode_id: values.periode_id,
        });
        const newId = res.data.data.id;
        setIndikatorId(newId);
        setWizardValues((prev) => ({
          ...prev,
          id: newId,
        }));
        values.id = newId;
        values.periode_id = values.periode_id || user?.periode_id;

        const rTujuan = await api.get("/tujuan", {
          params: {
            misi_id: values.misi_id,
            periode_id: values.periode_id || user?.periode_id,
          },
        });
        setOptions((prev) => ({
          ...prev,
          tujuan: normalizeListItems(rTujuan.data),
        }));
        setSuccess("Misi berhasil disimpan.");
      } else {
        switch (currentStage) {
          case "tujuan": {
            await api.put(`/indikator-wizard/${indikatorId}`, {
              stage: "tujuan",
              tujuan_id: values.tujuan_id,
              kode_indikator: values.kode_indikator,
              nama_indikator: values.nama_indikator,
              satuan: values.satuan,
              tipe_indikator: values.tipe_indikator,
              jenis_dokumen: user?.jenis_dokumen,
              tahun: user?.tahun,
            });
            if (values.detailTujuan?.length) {
              await api.post(
                `/indikator-tujuans-wizard/${indikatorId}/detail`,
                {
                  rows: values.detailTujuan,
                }
              );
            }
            setSuccess("Tujuan berhasil disimpan.");
            break;
          }

          case "sasaran": {
            if (!values.sasaran_id) {
              throw new Error("Sasaran belum dipilih.");
            }

            const enriched = values.detailSasaran?.map((row, index) => {
              const requiredFields = [
                "nama_indikator",
                "tipe_indikator",
                "tolok_ukur_kinerja",
                "target_kinerja",
              ];

              for (const key of requiredFields) {
                if (!row[key]) {
                  throw new Error(
                    `Indikator ke-${
                      index + 1
                    } belum lengkap (kolom '${key}' kosong).`
                  );
                }
              }

              return {
                ...row,
                indikator_id: indikatorId,
                sasaran_id: values.sasaran_id,
                tujuan_id: values.tujuan_id,
              };
            });

            await api.put(`/indikatorwizard/${indikatorId}`, {
              stage: "sasaran",
              sasaran_id: values.sasaran_id,
              kode_sasaran: values.kode_sasaran,
            });

            if (Array.isArray(enriched) && enriched.length) {
              await api.post(
                `/indikator-sasaran-wizard/${indikatorId}/detail`,
                {
                  rows: enriched,
                }
              );
            }

            setWizardValues((prev) => ({
              ...prev,
              detailSasaran: enriched,
            }));
            setSuccess("Sasaran berhasil disimpan.");
            break;
          }

          case "program": {
            await api.put(`/indikator-wizard/${indikatorId}`, {
              stage: "program",
              program_id: values.program_id,
            });
            setSuccess("Program berhasil disimpan.");
            break;
          }

          case "kegiatan": {
            await api.put(`/indikator-wizard/${indikatorId}`, {
              stage: "kegiatan",
              kegiatan_id: values.kegiatan_id,
            });
            if (values.kinerjaRows?.length) {
              await api.post(`/indikator-wizard/${indikatorId}/detail`, {
                rows: values.kinerjaRows,
              });
            }
            setSuccess("Kegiatan berhasil disimpan.");
            break;
          }

          default:
            break;
        }
      }

      setWizardValues(values);
      if (step < steps.length - 1) {
        setStep((s) => s + 1);
      } else {
        if (onSubmit) onSubmit(values);
        navigate("/dashboard");
      }
    } catch (e) {
      console.error("Gagal menyimpan data:", e);
      setError(
        e.response?.data?.message ||
          e.message ||
          "Terjadi kesalahan saat menyimpan data. Silakan coba kembali."
      );
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError("");
    setSuccess("");
    if (step > 0) setStep((s) => s - 1);
  };

  const StepComponent = stepComponents[step];
  const stepKey = steps[step].toLowerCase();
  const stepOptionsKey = stepOptionMappings[stepKey] || stepKey;
  const stepOptions = options[stepOptionsKey] || [];

  if (options.misi.length === 0) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status" />
        <div>Memuat data...</div>
      </div>
    );
  }

  return (
    <Formik
      initialValues={wizardValues}
      enableReinitialize
      validationSchema={wizardSchemas[step]}
      onSubmit={handleNext}
    >
      {({ values, setFieldValue }) => (
        <Form>
          <StepComponent
            options={options}
            stepOptions={stepOptions}
            values={values}
            setFieldValue={setFieldValue}
            onNext={() => handleNext(values)}
          />

          <Container>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            <h5>{steps[step]}</h5>
            <ProgressBar
              now={((step + 1) / steps.length) * 100}
              className="mb-3"
            />
            <div className="d-flex justify-content-between mt-3">
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={step === 0 || loading}
              >
                Kembali
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Spinner as="span" animation="border" size="sm" />
                ) : step === steps.length - 1 ? (
                  "Selesai"
                ) : (
                  "Selanjutnya"
                )}
              </Button>
            </div>
          </Container>

          <Button variant="link" onClick={() => navigate("/indikator-list")}>
            Lihat Daftar Indikator
          </Button>
        </Form>
      )}
    </Formik>
  );
}
