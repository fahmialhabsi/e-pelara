// File: frontend/src/features/renstra/indikator/strategi/components/IndikatorStrategiRenstraForm.jsx
import React, { useEffect, useState } from "react";
import { Form, Button, Card, Typography, App } from "antd";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import { generateKode } from "@/utils/kodeUtils";
import api from "@/services/api";

import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import TextAreaField from "@/shared/components/form/TextAreaField";

const { Text } = Typography;

const IndikatorStrategiRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [existingList, setExistingList] = useState([]);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get("/indikator-renstra", {
          params: { stage: "strategi", renstra_id: renstraAktif?.id },
        });
        setExistingList(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        message.error("Gagal mengambil data indikator strategi.");
      }
    };

    fetchExisting();
  }, [message, renstraAktif?.id]);

  const { form, onSubmit, isSubmitting, dropdowns } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/indikator-renstra",
    queryKeys: ["indikator-renstra", "strategi"],
    redirectPath: "/renstra/indikator/strategi",
    defaultValues: {
      strategi_renstra_id: "",
      kode_indikator: "",
      nama_indikator: "",
      satuan: "",
      target_tahun_1: "",
    },
    schema: () =>
      Yup.object().shape({
        strategi_renstra_id: Yup.number().required("Strategi Renstra wajib dipilih"),
        kode_indikator: Yup.string().required("Kode indikator wajib diisi"),
        nama_indikator: Yup.string().required("Nama indikator wajib diisi"),
        satuan: Yup.string().required("Satuan wajib diisi"),
        target_tahun_1: Yup.string().required("Target (th. ke-1) wajib diisi"),
      }),
    fetchOptions: {
      "strategi-renstra": async () => {
        const res = await api.get("/renstra-strategi", {
          params: { renstra_id: renstraAktif?.id },
        });
        return Array.isArray(res.data?.data) ? res.data.data : (res.data ?? []);
      },
    },
    generatePayload: (formData) => ({
      stage: "strategi",
      ref_id: formData.strategi_renstra_id,
      kode_indikator: formData.kode_indikator,
      nama_indikator: formData.nama_indikator,
      satuan: formData.satuan,
      target_tahun_1: formData.target_tahun_1,
      jenis_indikator: "Kuantitatif",
      tipe_indikator: "Outcome",
      renstra_id: formData.renstra_id,
    }),
  });

  const {
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (initialData?.ref_id) setValue("strategi_renstra_id", initialData.ref_id);
  }, [initialData, setValue]);

  const strategiIdWatched = watch("strategi_renstra_id");
  const strategiOptions = dropdowns["strategi-renstra"];

  /**
   * useRenstraFormTemplate tidak pernah memanggil `kodeGenerator` (dead option di hook),
   * jadi auto-fill Kode Indikator dipicu langsung di sini setiap Strategi Renstra berubah.
   */
  useEffect(() => {
    if (!strategiIdWatched || !strategiOptions) return;

    const selected = strategiOptions.find((x) => x.id === strategiIdWatched);
    if (!selected) return;

    setPreview(selected.deskripsi || "");

    const prefix = `IS${selected.kode_strategi}`;
    const filteredExistingList = existingList.filter(
      (item) => Number(item.ref_id) === Number(strategiIdWatched),
    );

    const kode = generateKode({
      prefix,
      dataList: filteredExistingList,
      field: "kode_indikator",
      padding: 2,
    });

    setValue("kode_indikator", kode);
  }, [strategiIdWatched, strategiOptions, existingList, setValue]);

  return (
    <Card
      title={initialData ? "Edit Indikator Strategi Renstra" : "Tambah Indikator Strategi Renstra"}
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>🔙 Kembali ke Dashboard</Button>
        <Button onClick={() => navigate("/renstra/indikator/strategi")}>
          📄 Lihat Daftar Indikator Strategi
        </Button>
      </div>

      <Form layout="vertical" onFinish={handleSubmit(onSubmit)} style={{ maxWidth: 700 }}>
        <SelectWithLabelValue
          name="strategi_renstra_id"
          label="Strategi Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Strategi"
          options={(dropdowns["strategi-renstra"] || []).map((item) => ({
            value: item.id,
            label: `${item.kode_strategi} - ${item.deskripsi}`,
          }))}
          onChange={(val) => setValue("strategi_renstra_id", val)}
        />

        {preview && (
          <Text type="secondary" style={{ marginTop: -8, display: "block", marginBottom: 12 }}>
            {preview}
          </Text>
        )}

        <Form.Item label="Kode Indikator">
          <div style={{ padding: "8px 12px", background: "#f5f5f5", borderRadius: 4 }}>
            {watch("kode_indikator") || "-"}
          </div>
        </Form.Item>

        <TextAreaField
          name="nama_indikator"
          label="Nama Indikator"
          control={control}
          errors={errors}
          required
          rows={3}
        />

        <InputField name="satuan" label="Satuan" control={control} errors={errors} required />

        <InputField
          name="target_tahun_1"
          label="Target (th. ke-1)"
          control={control}
          errors={errors}
          required
        />

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {initialData ? "Update" : "Simpan"}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default IndikatorStrategiRenstraForm;
