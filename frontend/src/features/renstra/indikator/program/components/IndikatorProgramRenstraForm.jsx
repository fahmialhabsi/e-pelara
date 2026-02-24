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

const IndikatorProgramRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [existingList, setExistingList] = useState([]);
  const [previewProgram, setPreviewProgram] = useState("");

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get("/indikator-program-renstra");
        setExistingList(res.data);
      } catch (error) {
        message.error("Gagal memuat data indikator program.");
      }
    };
    fetchExisting();
  }, [message]);

  const { form, onSubmit, isSubmitting, dropdowns } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/indikator-program-renstra",
    redirectPath: "/renstra/indikator-program",
    queryKeys: ["indikator-program-renstra"],
    defaultValues: {
      program_renstra_id: "",
      kode_indikator: "",
      nama_indikator: "",
      satuan: "",
      target_tahun_1: "",
    },
    schema: {
      program_renstra_id: (yup) =>
        yup.number().required("Program Renstra wajib dipilih"),
      kode_indikator: (yup) =>
        yup.string().required("Kode indikator wajib diisi"),
      nama_indikator: (yup) =>
        yup.string().required("Nama indikator wajib diisi"),
      satuan: (yup) => yup.string().required("Satuan wajib diisi"),
      target_tahun_1: (yup) =>
        yup.string().required("Target tahun 1 wajib diisi"),
    },
    fetchOptions: {
      "program-renstra": async () => {
        const res = await api.get("/program-renstra");
        return res.data;
      },
    },
    generatePayload: (data) => ({
      program_renstra_id: data.program_renstra_id,
      kode_indikator: data.kode_indikator,
      nama_indikator: data.nama_indikator,
      satuan: data.satuan,
      target_tahun_1: data.target_tahun_1,
    }),
    kodeGenerator: (watch, setValue) => {
      const programId = watch("program_renstra_id");
      const options = dropdowns["program-renstra"];
      if (!programId || !options) return;

      const selected = options.find((x) => x.id === programId);
      if (selected) {
        setPreviewProgram(selected.nama_program);
        const prefix = `IP${selected.kode_program}`;
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
          ? "Edit Indikator Program Renstra"
          : "Tambah Indikator Program Renstra"
      }
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali ke Dashboard
        </Button>
        <Button onClick={() => navigate("/renstra/indikator-program")}>
          📄 Daftar Indikator Program
        </Button>
      </div>

      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        style={{ maxWidth: 700 }}
      >
        <SelectWithLabelValue
          name="program_renstra_id"
          label="Program Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Program Renstra"
          options={(dropdowns["program-renstra"] || []).map((item) => ({
            value: item.id,
            label: `${item.kode_program} - ${item.nama_program}`,
          }))}
          onChange={(val) => setValue("program_renstra_id", val)}
        />

        {previewProgram && (
          <Text
            type="secondary"
            style={{ marginTop: -8, display: "block", marginBottom: 12 }}
          >
            {previewProgram}
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

export default IndikatorProgramRenstraForm;
