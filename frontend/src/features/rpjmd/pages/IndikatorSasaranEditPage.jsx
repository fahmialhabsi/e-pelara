// src/features/rpjmd/pages/IndikatorSasaranEditPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Formik } from "formik";
import { Spinner, Alert } from "react-bootstrap";
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
    <div className="p-4">
      <h4>Edit Indikator Sasaran</h4>
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
  );
}
