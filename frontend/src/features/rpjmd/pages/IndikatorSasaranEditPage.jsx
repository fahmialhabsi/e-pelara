// src/features/rpjmd/pages/IndikatorSasaranEditPage.jsx
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

export default function IndikatorSasaranEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/indikator-sasaran/${id}`)
      .then((res) => {
        const d = res.data;
        setInitialValues({
          indikator_id: d.id,
          kode_indikator: d.kode_indikator,
          nama_indikator: d.nama_indikator,
          tipe_indikator: d.tipe_indikator || "",
          jenis: d.jenis || "",
          tolok_ukur_kinerja: d.tolok_ukur_kinerja || "",
          target_kinerja: d.target_kinerja || "",
          jenis_indikator: d.jenis_indikator || "",
          kriteria_kuantitatif: d.kriteria_kuantitatif || "",
          kriteria_kualitatif: d.kriteria_kualitatif || "",
          satuan: d.satuan || "",
          definisi_operasional: d.definisi_operasional || "",
          metode_penghitungan: d.metode_penghitungan || "",
          baseline: d.baseline || "",
          target_tahun_1: d.target_tahun_1 || "",
          target_tahun_2: d.target_tahun_2 || "",
          target_tahun_3: d.target_tahun_3 || "",
          target_tahun_4: d.target_tahun_4 || "",
          target_tahun_5: d.target_tahun_5 || "",
          capaian_tahun_1: d.capaian_tahun_1 || "",
          capaian_tahun_2: d.capaian_tahun_2 || "",
          capaian_tahun_3: d.capaian_tahun_3 || "",
          capaian_tahun_4: d.capaian_tahun_4 || "",
          capaian_tahun_5: d.capaian_tahun_5 || "",
          sumber_data: d.sumber_data || "",
          penanggung_jawab: d.penanggung_jawab || "",
          keterangan: d.keterangan || "",
          rekomendasi_ai: d.rekomendasi_ai || "",
          tahun: d.tahun,
          jenis_dokumen: d.jenis_dokumen,
          misi_id: d.misi_id,
          tujuan_id: d.tujuan_id,
          sasaran_id: d.sasaran_id,
          nomor: d.sasaran_id,
          sasaran: [d],
        });
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
        onSubmit={async (values, { setSubmitting }) => {
          try {
            await api.put(`/indikator-sasaran/${id}`, values);
            navigate("/dashboard-rpjmd");
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
                stepKey="sasaran"
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
