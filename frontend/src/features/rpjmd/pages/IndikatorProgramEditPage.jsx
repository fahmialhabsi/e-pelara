// src/features/rpjmd/pages/IndikatorProgramEditPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import StepTemplate from "@/shared/components/steps/StepTemplate";
import { Spinner, Button, Alert } from "react-bootstrap";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget";

const validationSchema = Yup.object().shape({
  tolok_ukur_kinerja: Yup.string().required(),
  target_kinerja: Yup.string().required(),
  definisi_operasional: Yup.string().required(),
  metode_penghitungan: Yup.string().required(),
  baseline: Yup.string().required(),
});

export default function IndikatorProgramEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/indikator-program/${id}`)
      .then((res) => {
        const d = res.data;
        setInitialValues({
          tahun: d.tahun,
          jenis_dokumen: d.jenis_dokumen,
          misi_id: d.misi_id ?? "",
          tujuan_id: d.tujuan_id ?? "",
          sasaran_id: d.sasaran_id ?? "",
          program_id: d.program_id ? String(d.program_id) : "",
          program: d.program ? [d.program] : [],
          indikator_id: d.id,
          kode_indikator: d.kode_indikator,
          nama_indikator: d.nama_indikator,
          jenis: d.jenis || "",
          tolok_ukur_kinerja: d.tolok_ukur_kinerja,
          target_kinerja: d.target_kinerja,
          jenis_indikator: d.jenis_indikator || "",
          kriteria_kuantitatif: d.kriteria_kuantitatif || "",
          kriteria_kualitatif: d.kriteria_kualitatif || "",
          definisi_operasional: d.definisi_operasional,
          metode_penghitungan: d.metode_penghitungan,
          baseline: d.baseline,
          keterangan: d.keterangan,
          penanggung_jawab: d.penanggung_jawab,
          tipe_indikator: d.tipe_indikator,
          indikator_kinerja_dampak: d.indikator_kinerja_dampak,
          kriteria_id: d.kriteria_id,
          satuan: d.satuan,
          sumber_data: d.sumber_data,
          capaian_tahun_1: d.capaian_tahun_1,
          capaian_tahun_2: d.capaian_tahun_2,
          capaian_tahun_3: d.capaian_tahun_3,
          capaian_tahun_4: d.capaian_tahun_4,
          capaian_tahun_5: d.capaian_tahun_5,
          target_tahun_1: d.target_tahun_1,
          target_tahun_2: d.target_tahun_2,
          target_tahun_3: d.target_tahun_3,
          target_tahun_4: d.target_tahun_4,
          target_tahun_5: d.target_tahun_5,
        });
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
        onSubmit={async (values, { setSubmitting }) => {
          try {
            await api.put(`/indikator-program/${id}`, values);
            navigate("/rpjmd/indikator-program-list");
          } catch (err) {
            console.error(err);
            setError("Gagal menyimpan perubahan.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ values, setFieldValue, isSubmitting }) => {
          useSetPreviewFields(values, setFieldValue);
          useAutoIsiTahunDanTarget(values, setFieldValue);

          return (
            <Form>
              <StepTemplate
                stepKey="program"
                options={{ penanggungJawab: [] }}
                stepOptions={[]}
                tabKey={4}
                setTabKey={() => {}}
                onSave={() => {}}
              />
              {error && <Alert variant="danger">{error}</Alert>}
              <div className="mt-3 d-flex gap-2">
                <Button variant="secondary" onClick={() => navigate(-1)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Simpan Perubahan
                </Button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}
