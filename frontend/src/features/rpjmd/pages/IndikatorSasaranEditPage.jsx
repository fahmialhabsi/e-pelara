// src/features/rpjmd/pages/IndikatorSasaranEditPage.jsx
import React, { useState, useEffect } from "react";
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
  getIndikatorSasaranDetail,
  updateIndikatorSasaran,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import { mapIndikatorSasaranDetailToEditForm } from "@/features/rpjmd/services/indikatorRpjmdMapper";

const validationSchema = editSchemaForLevel("sasaran");

export default function IndikatorSasaranEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getIndikatorSasaranDetail(id)
      .then((res) => {
        const d = res.data;
        setInitialValues(mapIndikatorSasaranDetailToEditForm(d));
      })
      .catch((err) => {
        console.error(err);
        setError("Gagal ambil data indikator.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="p-0">
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
          <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: 0.3, color: "#fff" }}>
            ✏️ Edit Indikator Sasaran
          </h4>
          <div style={{ fontSize: 12, opacity: 0.72, marginTop: 3 }}>
            Perubahan akan disimpan pada indikator sasaran yang sedang Anda edit.
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
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          setError("");
          setErrors({});
          try {
            await updateIndikatorSasaran(id, values);
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
          stepKey="sasaran"
          stepTemplateOptions={{ penanggungJawab: [] }}
          error={error}
          navigate={navigate}
        />
      </Formik>
      </div>
    </div>
  );
}
