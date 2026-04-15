// src/features/rpjmd/pages/IndikatorProgramEditPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Formik } from "formik";
import { Spinner, Alert } from "react-bootstrap";
import IndikatorSimpleEditFormBody from "@/features/rpjmd/components/IndikatorSimpleEditFormBody";
import { extractSingleData } from "@/utils/apiResponse";
import { editSchemaForLevel } from "@/validations/indikatorSchemas";
import {
  mapBackendErrorsToFormik,
  pickBackendErrorMessage,
} from "@/utils/mapBackendErrorsToFormik";
import {
  getIndikatorProgramDetail,
  updateIndikatorProgram,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import { mapIndikatorProgramDetailToEditForm } from "@/features/rpjmd/services/indikatorRpjmdMapper";

const validationSchema = editSchemaForLevel("program");

export default function IndikatorProgramEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getIndikatorProgramDetail(id)
      .then((res) => {
        const d = extractSingleData(res.data);
        setInitialValues(mapIndikatorProgramDetailToEditForm(d));
      })
      .catch((err) => {
        console.error(err);
        setError("Gagal mengambil data indikator program.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="p-4">
      <h4>Edit Indikator Program</h4>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          setError("");
          setErrors({});
          try {
            await updateIndikatorProgram(id, values);
            navigate("/dashboard-rpjmd/indikator-program-list");
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
          stepKey="program"
          stepTemplateOptions={{ penanggungJawab: [] }}
          error={error}
          navigate={navigate}
        />
      </Formik>
    </div>
  );
}
