import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Formik, Form, useFormikContext } from "formik";
import StepTemplate from "@/shared/components/steps/StepTemplate";
import { Spinner, Button, Alert } from "react-bootstrap";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget";
import { extractSingleData, normalizeListItems } from "@/utils/apiResponse";
import { editSchemaForLevel } from "@/validations/indikatorSchemas";
import {
  mapBackendErrorsToFormik,
  pickBackendErrorMessage,
} from "@/utils/mapBackendErrorsToFormik";
import {
  fetchIndikatorProgramOptions,
  fetchKegiatanByProgram,
  getIndikatorKegiatanDetail,
  updateIndikatorKegiatan,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import {
  mapIndikatorKegiatanDetailToEditForm,
  mapIndikatorProgramRowsToSelectOptions,
  mapKegiatanRowsToSelectOptions,
} from "@/features/rpjmd/services/indikatorRpjmdMapper";

const validationSchema = editSchemaForLevel("kegiatan");

function KegiatanEditFormBody({
  kegiatanOptions,
  programIndikatorOptions,
  error,
  onCancel,
}) {
  const { values, setFieldValue, isSubmitting } = useFormikContext();

  useEffect(() => {
    if ((!values.kegiatan_id || values.kegiatan_id === "") && kegiatanOptions.length > 0) {
      setFieldValue("kegiatan_id", kegiatanOptions[0].value);
    }
  }, [kegiatanOptions, values.kegiatan_id, setFieldValue]);

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  return (
    <Form>
      <StepTemplate
        stepKey="kegiatan"
        options={{
          penanggungJawab: [],
          kegiatan: kegiatanOptions,
          indikatorProgram: programIndikatorOptions,
        }}
        stepOptions={[]}
        tabKey={4}
        setTabKey={() => {}}
        showTab5WizardActions={false}
      />
      {error && <Alert variant="danger">{error}</Alert>}
      <Alert variant="info" className="small py-2 mb-3">
        Perubahan diterapkan pada <strong>indikator kegiatan</strong> ini dan
        tercermin di daftar indikator kegiatan setelah simpan berhasil.
      </Alert>
      <div className="mt-3 d-flex gap-2 align-items-center flex-wrap">
        <Button variant="secondary" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "Simpan Perubahan"}
        </Button>
      </div>
    </Form>
  );
}

export default function IndikatorKegiatanEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [programIndikatorOptions, setProgramIndikatorOptions] = useState([]);
  const [kegiatanOptions, setKegiatanOptions] = useState([]);
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getIndikatorKegiatanDetail(id)
      .then((res) => {
        const detail = extractSingleData(res.data);
        setInitialValues(mapIndikatorKegiatanDetailToEditForm(detail));
      })
      .catch((err) => {
        console.error("Gagal ambil detail indikator kegiatan:", err);
        setError("Gagal mengambil data indikator kegiatan.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (
      !initialValues?.tahun ||
      !initialValues?.jenis_dokumen ||
      !initialValues?.program_id
    ) {
      return;
    }

    fetchKegiatanByProgram({
      tahun: initialValues.tahun,
      jenis_dokumen: initialValues.jenis_dokumen,
      program_id: initialValues.program_id,
    })
      .then((res) => {
        const opts = mapKegiatanRowsToSelectOptions(normalizeListItems(res.data));
        setKegiatanOptions(opts);
      })
      .catch((err) => console.error("Gagal fetch kegiatan:", err));
  }, [
    initialValues?.tahun,
    initialValues?.jenis_dokumen,
    initialValues?.program_id,
  ]);

  useEffect(() => {
    const { program_id, tahun, jenis_dokumen } = initialValues || {};
    if (!program_id || !tahun || !jenis_dokumen) return;

    fetchIndikatorProgramOptions({ program_id, tahun, jenis_dokumen })
      .then((res) => {
        const opts = mapIndikatorProgramRowsToSelectOptions(
          normalizeListItems(res.data)
        );
        setProgramIndikatorOptions(opts);
      })
      .catch((err) => console.error("Gagal ambil indikator program:", err));
  }, [initialValues]);

  if (loading) return <Spinner animation="border" />;
  if (error && !initialValues) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="p-0">
      <div
        style={{
          background: "linear-gradient(135deg,#1a237e 0%,#283593 100%)",
          color: "#fff",
          padding: "16px 24px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(26,35,126,.18)",
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>
            ✏️ Edit Indikator Kegiatan
          </h4>
          <div style={{ fontSize: 12, opacity: 0.72, marginTop: 3 }}>
            Perubahan disimpan pada indikator kegiatan ini.
          </div>
        </div>
        <Button variant="outline-light" size="sm" onClick={() => navigate(-1)} style={{ fontWeight: 600 }}>
          ✕ Tutup
        </Button>
      </div>
      <div className="p-4 pt-3">
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          setError("");
          setErrors({});
          try {
            await updateIndikatorKegiatan(id, values);
            navigate("/dashboard-rpjmd/indikator-kegiatan-list");
          } catch (err) {
            console.error(err);
            const data = err?.response?.data;
            setError(
              pickBackendErrorMessage(data, "Gagal menyimpan perubahan.")
            );
            setErrors(mapBackendErrorsToFormik(data));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <KegiatanEditFormBody
          kegiatanOptions={kegiatanOptions}
          programIndikatorOptions={programIndikatorOptions}
          error={error}
          onCancel={() => navigate(-1)}
        />
      </Formik>
      </div>
    </div>
  );
}
