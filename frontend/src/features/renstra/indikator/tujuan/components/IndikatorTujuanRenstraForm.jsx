import React, { useEffect, useState } from "react";
import { Form, Button, Card, Typography, App } from "antd";
import { useNavigate } from "react-router-dom";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import api from "@/services/api";

// Reusable Components
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import TextAreaField from "@/shared/components/form/TextAreaField";

const { Text } = Typography;

const IndikatorTujuanRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [existingList, setExistingList] = useState([]);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get("/indikator-tujuan-renstra");
        setExistingList(res.data);
      } catch (err) {
        message.error("Gagal memuat data indikator tujuan");
      }
    };
    fetchExisting();
  }, [message]);

  const { form, onSubmit, isSubmitting, dropdowns } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/indikator-tujuan-renstra",
    queryKeys: ["indikator-tujuan-renstra"],
    redirectPath: "/renstra/indikator-tujuan",
    defaultValues: {
      tujuan_renstra_id: "",
      kode_indikator: "",
      nama_indikator: "",
      satuan: "",
      target_tahun_1: "",
    },
    schema: {
      tujuan_renstra_id: (yup) =>
        yup.number().required("Tujuan Renstra wajib dipilih"),
      kode_indikator: (yup) =>
        yup.string().required("Kode indikator wajib diisi"),
      nama_indikator: (yup) =>
        yup.string().required("Nama indikator wajib diisi"),
      satuan: (yup) => yup.string().required("Satuan wajib diisi"),
      target_tahun_1: (yup) =>
        yup.string().required("Target tahun 1 wajib diisi"),
    },
    fetchOptions: {
      "tujuan-renstra": async () => {
        const res = await api.get("/tujuan-renstra");
        return res.data;
      },
    },
    generatePayload: (formData) => ({
      tujuan_renstra_id: formData.tujuan_renstra_id,
      kode_indikator: formData.kode_indikator,
      nama_indikator: formData.nama_indikator,
      satuan: formData.satuan,
      target_tahun_1: formData.target_tahun_1,
    }),
    kodeGenerator: (watch, setValue) => {
      const selectedId = watch("tujuan_renstra_id");
      const list = dropdowns["tujuan-renstra"];
      if (!selectedId || !list) return;

      const selected = list.find((item) => item.id === selectedId);
      if (selected) {
        setPreview(selected.nama_tujuan);
        const base = `ITU${selected.kode_tujuan}`;
        const count = existingList.filter((i) =>
          i.kode_indikator?.startsWith(base)
        ).length;
        const padded = String(count + 1).padStart(2, "0");
        setValue("kode_indikator", `${base}.${padded}`);
      }
    },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = form;

  return (
    <Card
      title={
        initialData
          ? "Edit Indikator Tujuan Renstra"
          : "Tambah Indikator Tujuan Renstra"
      }
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali ke Dashboard
        </Button>
        <Button onClick={() => navigate("/renstra/indikator-tujuan")}>
          📄 Lihat Daftar Indikator Tujuan
        </Button>
      </div>

      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        style={{ maxWidth: 700 }}
      >
        <SelectWithLabelValue
          name="tujuan_renstra_id"
          label="Tujuan Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Tujuan"
          options={(dropdowns["tujuan-renstra"] || []).map((item) => ({
            value: item.id,
            label: `${item.kode_tujuan} - ${item.nama_tujuan}`,
          }))}
          onChange={(val) => setValue("tujuan_renstra_id", val)}
        />

        {preview && (
          <Text
            type="secondary"
            style={{ marginTop: -8, display: "block", marginBottom: 12 }}
          >
            {preview}
          </Text>
        )}

        <Form.Item label="Kode Indikator">
          <div
            style={{
              padding: "8px 12px",
              background: "#f5f5f5",
              borderRadius: 4,
            }}
          >
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

export default IndikatorTujuanRenstraForm;
