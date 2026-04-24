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

const IndikatorSubKegiatanRenstraForm = ({
  initialData = null,
  renstraAktif,
}) => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [existingList, setExistingList] = useState([]);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get("/indikator-sub-kegiatan-renstra");
        setExistingList(res.data);
      } catch (err) {
        message.error("Gagal memuat data indikator sub kegiatan.");
      }
    };
    fetchExisting();
  }, [message]);

  const { form, onSubmit, isSubmitting, dropdowns } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/indikator-sub-kegiatan-renstra",
    redirectPath: "/renstra/indikator-sub-kegiatan",
    queryKeys: ["indikator-sub-kegiatan-renstra"],
    defaultValues: {
      sub_kegiatan_renstra_id: "",
      kode_indikator: "",
      nama_indikator: "",
      satuan: "",
      target_tahun_1: "",
    },
    schema: {
      sub_kegiatan_renstra_id: (yup) =>
        yup.number().required("Sub Kegiatan Renstra wajib dipilih"),
      kode_indikator: (yup) =>
        yup.string().required("Kode indikator wajib diisi"),
      nama_indikator: (yup) =>
        yup.string().required("Nama indikator wajib diisi"),
      satuan: (yup) => yup.string().required("Satuan wajib diisi"),
      target_tahun_1: (yup) =>
        yup.string().required("Target (th. ke-1) wajib diisi"),
    },
    fetchOptions: {
      "sub-kegiatan-renstra": async () => {
        const res = await api.get("/sub-kegiatan-renstra");
        return res.data;
      },
    },
    generatePayload: (formData) => ({
      sub_kegiatan_renstra_id: formData.sub_kegiatan_renstra_id,
      kode_indikator: formData.kode_indikator,
      nama_indikator: formData.nama_indikator,
      satuan: formData.satuan,
      target_tahun_1: formData.target_tahun_1,
    }),
    kodeGenerator: (watch, setValue) => {
      const selectedId = watch("sub_kegiatan_renstra_id");
      const list = dropdowns["sub-kegiatan-renstra"];
      if (!selectedId || !list) return;

      const selected = list.find((s) => s.id === selectedId);
      if (selected) {
        setPreview(selected.nama_sub_kegiatan);
        const prefix = `ISK${selected.kode_sub_kegiatan}`;
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
    setValue,
    watch,
    control,
    formState: { errors },
  } = form;

  return (
    <Card
      title={
        initialData
          ? "Edit Indikator Sub Kegiatan Renstra"
          : "Tambah Indikator Sub Kegiatan Renstra"
      }
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali ke Dashboard
        </Button>
        <Button onClick={() => navigate("/renstra/indikator-sub-kegiatan")}>
          📄 Lihat Daftar Indikator Sub Kegiatan
        </Button>
      </div>

      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        style={{ maxWidth: 700 }}
      >
        <SelectWithLabelValue
          name="sub_kegiatan_renstra_id"
          label="Sub Kegiatan Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Sub Kegiatan"
          options={(dropdowns["sub-kegiatan-renstra"] || []).map((item) => ({
            value: item.id,
            label: `${item.kode_sub_kegiatan} - ${item.nama_sub_kegiatan}`,
          }))}
          onChange={(val) => setValue("sub_kegiatan_renstra_id", val)}
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

export default IndikatorSubKegiatanRenstraForm;
