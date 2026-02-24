import React, { useEffect, useState } from "react";
import { Form, Button, Card, Typography, App } from "antd";
import { useNavigate } from "react-router-dom";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import { generateKode } from "@/utils/kodeUtils";
import api from "@/services/api";

import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import TextAreaField from "@/shared/components/form/TextAreaField";
import InputField from "@/shared/components/form/InputField";

const { Text } = Typography;

const IndikatorKegiatanRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp(); // ✅ agar tidak warning antd
  const [existingList, setExistingList] = useState([]);
  const [previewKegiatan, setPreviewKegiatan] = useState("");

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get("/indikator-kegiatan-renstra");
        setExistingList(res.data);
      } catch (err) {
        message.error("Gagal memuat data indikator kegiatan.");
      }
    };
    fetchExisting();
  }, [message]);

  const { form, onSubmit, isSubmitting, dropdowns } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/indikator-kegiatan-renstra",
    redirectPath: "/renstra/indikator-kegiatan",
    queryKeys: ["indikator-kegiatan-renstra"],
    defaultValues: {
      kegiatan_renstra_id: "",
      kode_indikator: "",
      nama_indikator: "",
      satuan: "",
      target_tahun_1: "",
    },
    schema: {
      kegiatan_renstra_id: (yup) =>
        yup.number().required("Kegiatan Renstra wajib dipilih"),
      kode_indikator: (yup) =>
        yup.string().required("Kode indikator wajib diisi"),
      nama_indikator: (yup) =>
        yup.string().required("Nama indikator wajib diisi"),
      satuan: (yup) => yup.string().required("Satuan wajib diisi"),
      target_tahun_1: (yup) =>
        yup.string().required("Target tahun 1 wajib diisi"),
    },
    fetchOptions: {
      "kegiatan-renstra": async () => {
        const res = await api.get("/kegiatan-renstra");
        return res.data;
      },
    },
    generatePayload: (formData) => ({
      kegiatan_renstra_id: formData.kegiatan_renstra_id,
      kode_indikator: formData.kode_indikator,
      nama_indikator: formData.nama_indikator,
      satuan: formData.satuan,
      target_tahun_1: formData.target_tahun_1,
    }),
    kodeGenerator: (watch, setValue) => {
      const kegiatanId = watch("kegiatan_renstra_id");
      const options = dropdowns["kegiatan-renstra"];
      if (!kegiatanId || !options) return;

      const selected = options.find((x) => x.id === kegiatanId);
      if (selected) {
        setPreviewKegiatan(selected.nama_kegiatan);
        const prefix = `IKG${selected.kode_kegiatan}`;
        const kode = generateKode({
          prefix,
          dataList: existingList,
          field: "kode_indikator",
          padding: 2,
        });
        setValue("kode_indikator", kode);
      }
    },
  });

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  return (
    <Card
      title={
        initialData
          ? "Edit Indikator Kegiatan Renstra"
          : "Tambah Indikator Kegiatan Renstra"
      }
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali ke Dashboard
        </Button>
        <Button onClick={() => navigate("/renstra/indikator-kegiatan")}>
          📄 Daftar Indikator Kegiatan
        </Button>
      </div>

      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        style={{ maxWidth: 700 }}
      >
        <SelectWithLabelValue
          name="kegiatan_renstra_id"
          label="Kegiatan Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Kegiatan Renstra"
          options={(dropdowns["kegiatan-renstra"] || []).map((item) => ({
            value: item.id,
            label: `${item.kode_kegiatan} - ${item.nama_kegiatan}`,
          }))}
          onChange={(val) => setValue("kegiatan_renstra_id", val)}
        />

        {previewKegiatan && (
          <Text
            type="secondary"
            style={{ marginTop: -8, display: "block", marginBottom: 12 }}
          >
            {previewKegiatan}
          </Text>
        )}

        <Form.Item label="Kode Indikator">
          <div style={{ background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
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

        <InputField
          name="satuan"
          label="Satuan"
          control={control}
          errors={errors}
          required
        />

        <InputField
          name="target_tahun_1"
          label="Target Tahun 1"
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

export default IndikatorKegiatanRenstraForm;
