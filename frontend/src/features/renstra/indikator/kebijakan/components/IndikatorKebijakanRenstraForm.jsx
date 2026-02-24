import React, { useEffect, useState } from "react";
import { Form, Button, Card, Typography, App } from "antd";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";
import api from "@/services/api";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import { generateKode } from "@/utils/kodeUtils";

import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import TextAreaField from "@/shared/components/form/TextAreaField";
import InputField from "@/shared/components/form/InputField";

const { Text } = Typography;

const schema = Yup.object().shape({
  kebijakan_renstra_id: Yup.number().required(
    "Kebijakan Renstra wajib dipilih"
  ),
  kode_indikator: Yup.string().required("Kode indikator wajib diisi"),
  nama_indikator: Yup.string().required("Nama indikator wajib diisi"),
  satuan: Yup.string().required("Satuan wajib diisi"),
  target_tahun_1: Yup.string().required("Target tahun 1 wajib diisi"),
});

const IndikatorKebijakanRenstraForm = ({
  initialData = null,
  renstraAktif,
}) => {
  const navigate = useNavigate();
  const { message } = App.useApp(); // ✅ gunakan message context
  const [existingList, setExistingList] = useState([]);
  const [previewKebijakan, setPreviewKebijakan] = useState("");

  // Fetch data indikator yang sudah ada
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get("/indikator-kebijakan-renstra");
        setExistingList(res.data);
      } catch (err) {
        message.error("Gagal memuat data indikator.");
      }
    };
    fetchExisting();
  }, [message]);

  const { form, onSubmit, isSubmitting, dropdowns } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/indikator-kebijakan-renstra",
    schema,
    redirectPath: "/renstra/indikator-kebijakan",
    queryKeys: ["indikator-kebijakan-renstra"],
    defaultValues: {
      kebijakan_renstra_id: "",
      kode_indikator: "",
      nama_indikator: "",
      satuan: "",
      target_tahun_1: "",
    },
    fetchOptions: {
      "kebijakan-renstra": async () => {
        const res = await api.get("/kebijakan-renstra");
        return res.data;
      },
    },
    generatePayload: (data) => ({
      kebijakan_renstra_id: data.kebijakan_renstra_id,
      kode_indikator: data.kode_indikator,
      nama_indikator: data.nama_indikator,
      satuan: data.satuan,
      target_tahun_1: data.target_tahun_1,
    }),
    kodeGenerator: (watch, setValue) => {
      const kebijakanId = watch("kebijakan_renstra_id");
      const options = dropdowns["kebijakan-renstra"];
      if (!kebijakanId || !options) return;

      const selected = options.find((item) => item.id === kebijakanId);
      if (selected) {
        setPreviewKebijakan(selected.nama_kebijakan);
        const prefix = `IK${selected.kode_kebijakan}`;
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
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <Card
      title={
        initialData
          ? "Edit Indikator Kebijakan Renstra"
          : "Tambah Indikator Kebijakan Renstra"
      }
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali
        </Button>
        <Button onClick={() => navigate("/renstra/indikator-kebijakan")}>
          📄 Daftar Indikator Kebijakan
        </Button>
      </div>

      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        style={{ maxWidth: 700 }}
      >
        <SelectWithLabelValue
          name="kebijakan_renstra_id"
          label="Kebijakan Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Kebijakan Renstra"
          options={(dropdowns["kebijakan-renstra"] || []).map((item) => ({
            value: item.id,
            label: `${item.kode_kebijakan} - ${item.nama_kebijakan}`,
          }))}
          onChange={(val) => setValue("kebijakan_renstra_id", val)}
        />

        {previewKebijakan && (
          <Text
            type="secondary"
            style={{ marginTop: -8, display: "block", marginBottom: 12 }}
          >
            {previewKebijakan}
          </Text>
        )}

        <Form.Item label="Kode Indikator">
          <div
            style={{
              background: "#f5f5f5",
              padding: 8,
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

export default IndikatorKebijakanRenstraForm;
