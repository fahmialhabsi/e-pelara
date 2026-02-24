// src/features/rpjmd/pages/IndikatorKegiatanEditPage.jsx
import React, { useEffect, useState } from "react";
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

export default function IndikatorKegiatanEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [programIndikatorOptions, setProgramIndikatorOptions] = useState([]);
  const [kegiatanOptions, setKegiatanOptions] = useState([]);
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/indikator-kegiatan/${id}`)
      .then((res) => {
        const d = res.data;
        setInitialValues({
          indikator_id: d.id,
          kode_indikator: d.kode_indikator || "",
          nama_indikator: d.nama_indikator || "",
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
          capaian_tahun_1: d.capaian_tahun_1 || "",
          capaian_tahun_2: d.capaian_tahun_2 || "",
          capaian_tahun_3: d.capaian_tahun_3 || "",
          capaian_tahun_4: d.capaian_tahun_4 || "",
          capaian_tahun_5: d.capaian_tahun_5 || "",
          target_tahun_1: d.target_tahun_1 || "",
          target_tahun_2: d.target_tahun_2 || "",
          target_tahun_3: d.target_tahun_3 || "",
          target_tahun_4: d.target_tahun_4 || "",
          target_tahun_5: d.target_tahun_5 || "",
          sumber_data: d.sumber_data || "",
          penanggung_jawab: d.penanggung_jawab || "",
          keterangan: d.keterangan || "",
          rekomendasi_ai: d.rekomendasi_ai || "",
          tahun: d.tahun,
          jenis_dokumen: d.jenis_dokumen || d.jenis_dokumen || "RPJMD",
          misi_id: d.misi_id ?? "",
          tujuan_id: d.tujuan_id ?? "",
          sasaran_id: d.sasaran_id ?? "",
          program_id: d.program_id ? String(d.program_id) : "",
          kegiatan_id: d.kegiatan_id ? String(d.kegiatan_id) : "",
          indikator_program_id: d.indikator_program_id || null,
          tipe_indikator: d.tipe_indikator || "",
        });
      })
      .catch((err) => {
        console.error("❌ Gagal ambil detail indikator kegiatan:", err);
        setError("Gagal mengambil data indikator kegiatan.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (
      !initialValues?.tahun ||
      !initialValues?.jenis_dokumen ||
      !initialValues?.program_id
    )
      return;

    const params = {
      tahun: initialValues.tahun,
      jenis_dokumen: initialValues.jenis_dokumen,
      program_id: initialValues.program_id,
    };

    api
      .get("/kegiatan", { params })
      .then((res) => {
        const opts = Array.isArray(res.data?.data)
          ? res.data.data.map((it) => ({
              value: String(it.id),
              label: `${it.kode_kegiatan} – ${it.nama_kegiatan}`,
              misi_id: it.misi_id,
              tujuan_id: it.tujuan_id,
              sasaran_id: it.sasaran_id,
              program_id: it.program_id,
            }))
          : [];
        setKegiatanOptions(opts);
      })
      .catch((err) => console.error("❌ Gagal fetch kegiatan:", err));
  }, [
    initialValues?.tahun,
    initialValues?.jenis_dokumen,
    initialValues?.program_id,
  ]);

  useEffect(() => {
    const { program_id, tahun, jenis_dokumen } = initialValues || {};
    if (!program_id || !tahun || !jenis_dokumen) return;

    api
      .get("/indikator-program", {
        params: { program_id, tahun, jenis_dokumen },
      })
      .then((res) => {
        const opts = Array.isArray(res.data)
          ? res.data.map((it) => ({
              value: it.id,
              label: `${it.kode_indikator} – ${it.nama_indikator}`,
            }))
          : [];
        setProgramIndikatorOptions(opts);
      })
      .catch((err) => console.error("❌ Gagal ambil indikator program:", err));
  }, [initialValues]);

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="p-4">
      <h4>Edit Indikator Kegiatan</h4>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            await api.put(`/indikator-kegiatan/${id}`, values);
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
          useEffect(() => {
            if (
              (!values.kegiatan_id || values.kegiatan_id === "") &&
              kegiatanOptions.length > 0
            ) {
              const firstOption = kegiatanOptions[0];
              setFieldValue("kegiatan_id", firstOption.value);
              console.log("⚙️ Auto set kegiatan_id:", firstOption.value);
            }
          }, [kegiatanOptions, values.kegiatan_id]);

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
