import React, { useEffect, useState } from "react";
import { Form, Button, Card, Typography, App } from "antd";
import { useNavigate } from "react-router-dom";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import { generateKode } from "@/utils/kodeUtils";
import api from "@/services/api";

import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import TextAreaField from "@/shared/components/form/TextAreaField";

const { Text } = Typography;

const IndikatorSasaranRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [existingList, setExistingList] = useState([]);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get("/indikator-sasaran-renstra");
        setExistingList(res.data);
      } catch (err) {
        message.error("Gagal mengambil data indikator sasaran.");
      }
    };
    fetchExisting();
  }, [message]);

  const { form, onSubmit, isSubmitting, dropdowns } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/indikator-sasaran-renstra",
    queryKeys: ["indikator-sasaran-renstra"],
    redirectPath: "/renstra/indikator-sasaran",
    defaultValues: {
      sasaran_renstra_id: "",
      kode_indikator: "",
      nama_indikator: "",
      satuan: "",
      target_tahun_1: "",
    },
    schema: {
      sasaran_renstra_id: (yup) =>
        yup.number().required("Sasaran Renstra wajib dipilih"),
      kode_indikator: (yup) =>
        yup.string().required("Kode indikator wajib diisi"),
      nama_indikator: (yup) =>
        yup.string().required("Nama indikator wajib diisi"),
      satuan: (yup) => yup.string().required("Satuan wajib diisi"),
      target_tahun_1: (yup) =>
        yup.string().required("Target (th. ke-1) wajib diisi"),
    },
    fetchOptions: {
      "sasaran-renstra": async () => {
        const res = await api.get("/sasaran-renstra");
        return res.data;
      },
    },
    generatePayload: (formData) => ({
      sasaran_renstra_id: formData.sasaran_renstra_id,
      kode_indikator: formData.kode_indikator,
      nama_indikator: formData.nama_indikator,
      satuan: formData.satuan,
      target_tahun_1: formData.target_tahun_1,
    }),
    kodeGenerator: (watch, setValue) => {
      const sasaranId = watch("sasaran_renstra_id");
      const options = dropdowns["sasaran-renstra"];
      if (!sasaranId || !options) return;

      const selected = options.find((x) => x.id === sasaranId);
      if (selected) {
        setPreview(selected.nama_sasaran);
        const prefix = `ISA${selected.kode_sasaran}`;
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
          ? "Edit Indikator Sasaran Renstra"
          : "Tambah Indikator Sasaran Renstra"
      }
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali ke Dashboard
        </Button>
        <Button onClick={() => navigate("/renstra/indikator-sasaran")}>
          📄 Lihat Daftar Indikator Sasaran
        </Button>
      </div>

      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        style={{ maxWidth: 700 }}
      >
        <SelectWithLabelValue
          name="sasaran_renstra_id"
          label="Sasaran Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Sasaran"
          options={(dropdowns["sasaran-renstra"] || []).map((item) => ({
            value: item.id,
            label: `${item.kode_sasaran} - ${item.nama_sasaran}`,
          }))}
          onChange={(val) => setValue("sasaran_renstra_id", val)}
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

export default IndikatorSasaranRenstraForm;
