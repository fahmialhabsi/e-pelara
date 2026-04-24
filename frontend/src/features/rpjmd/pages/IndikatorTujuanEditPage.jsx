// src/features/rpjmd/pages/IndikatorTujuanEditPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Formik } from "formik";
import { Spinner, Alert, Button } from "react-bootstrap";
import IndikatorSimpleEditFormBody from "@/features/rpjmd/components/IndikatorSimpleEditFormBody";
import { editSchemaForLevel } from "@/validations/indikatorSchemas";
import {
  mapBackendErrorsToFormik,
  pickBackendErrorMessage,
} from "@/utils/mapBackendErrorsToFormik";
import {
  getIndikatorTujuanDetail,
  updateIndikatorTujuan,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import { mapIndikatorTujuanDetailToEditForm } from "@/features/rpjmd/services/indikatorRpjmdMapper";
import { extractSingleData } from "@/utils/apiResponse";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";

const validationSchema = editSchemaForLevel("tujuan");

export default function IndikatorTujuanEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { periodeList } = usePeriodeAktif();
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getIndikatorTujuanDetail(id)
      .then((res) => {
        const d = extractSingleData(res.data) ?? res.data;
        setInitialValues(mapIndikatorTujuanDetailToEditForm(d));
      })
      .catch((err) => {
        console.error(err);
        setError("Gagal ambil data indikator.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const periodeRpjmdLabel = useMemo(() => {
    if (!initialValues) return "";
    const pid = initialValues.periode_id;
    const p = (periodeList || []).find((x) => String(x.id) === String(pid));
    const start = p?.tahun_awal ?? initialValues.tahun_awal ?? 2025;
    const end = p?.tahun_akhir ?? initialValues.tahun_akhir ?? 2029;
    return `Periode RPJMD: ${start} – ${end}`;
  }, [initialValues, periodeList]);

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="p-0">
      {/* ── Page header profesional ── */}
      <div
        style={{
          background: "linear-gradient(135deg,#1a237e 0%,#283593 100%)",
          color: "#fff",
          padding: "16px 24px 14px",
          marginBottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(26,35,126,.18)",
        }}
      >
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 0.3,
              color: "#fff",
            }}
          >
            ✏️ Edit Indikator Tujuan
          </h4>
          <div style={{ fontSize: 12, opacity: 0.72, marginTop: 3 }}>
            Perubahan akan disimpan pada indikator tujuan yang sedang Anda edit.
          </div>
          {periodeRpjmdLabel ? (
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, fontWeight: 600 }}>
              {periodeRpjmdLabel}
            </div>
          ) : null}
        </div>
        <Button
          variant="outline-light"
          size="sm"
          onClick={() => navigate(-1)}
          style={{ fontWeight: 600 }}
        >
          ✕ Tutup
        </Button>
      </div>

      <div className="p-4 pt-3">
      <Formik
        key={String(id)}
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          setError("");
          setErrors({});
          try {
            await updateIndikatorTujuan(id, values);
            navigate("/dashboard-rpjmd");
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
        <IndikatorSimpleEditFormBody
          stepKey="tujuan"
          stepTemplateOptions={{ penanggungJawab: [] }}
          error={error}
          navigate={navigate}
          skipActivePeriodeSync
        />
      </Formik>
      </div>
    </div>
  );
}
