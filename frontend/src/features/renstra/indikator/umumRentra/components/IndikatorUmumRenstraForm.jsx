import React, { useEffect, useState, useCallback } from "react";
import { Form, Button, Card, Space, App, Dropdown } from "antd";
import { useNavigate } from "react-router-dom";
import { DownOutlined } from "@ant-design/icons";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import api from "@/services/api";
import * as Yup from "yup";

import InputField from "@/shared/components/form/InputField";
import TextAreaField from "@/shared/components/form/TextAreaField";

/** `kebijakan` = stage di DB (`indikator_renstra.stage`), sumber: indikator arah kebijakan RPJMD */
const IMPORT_DARI_RPJM_MENU = [
  { stage: "tujuan", label: "Import Tujuan" },
  { stage: "sasaran", label: "Import Sasaran" },
  { stage: "strategi", label: "Import Strategi" },
  { stage: "kebijakan", label: "Import Arah Kebijakan" },
  { stage: "program", label: "Import Program" },
  { stage: "kegiatan", label: "Import Kegiatan" },
  { stage: "sub_kegiatan", label: "Import Sub Kegiatan" },
];

const IndikatorUmumRenstraForm = ({ renstraAktif, initialData = null }) => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [existingList, setExistingList] = useState([]);

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get("/indikator-renstra");
        setExistingList(res.data || []);
      } catch (err) {
        console.error(err);
        message.error("Gagal memuat data indikator umum");
      }
    };
    fetchExisting();
  }, [message]);

  const schema = Yup.object().shape({
    kode_indikator: Yup.string().required("Kode indikator wajib diisi"),
    nama_indikator: Yup.string().required("Nama indikator wajib diisi"),
    satuan: Yup.string().required("Satuan wajib diisi"),
    target_tahun_1: Yup.string().required("Target (th. ke-1) wajib diisi"),
  });

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/indikator-renstra",
    queryKeys: ["indikator-renstra"],
    redirectPath: "/renstra/indikator-umum",
    defaultValues: {
      kode_indikator: "",
      nama_indikator: "",
      satuan: "",
      target_tahun_1: "",
    },
    schema,
    kodeGenerator: (_programId, setValue, _getValues) => {
      const prefix = "IUM";
      const count = existingList.length;
      const padded = String(count + 1).padStart(2, "0");
      setValue("kode_indikator", `${prefix}.${padded}`);
    },
    generatePayload: (formData) => ({
      kode_indikator: formData.kode_indikator,
      nama_indikator: formData.nama_indikator,
      satuan: formData.satuan,
      target_tahun_1: formData.target_tahun_1,
    }),
  });

  const {
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = form;

  // 🔹 Safe handleImport
  const handleImport = useCallback(
    async (stage) => {
      if (!renstraAktif?.id) {
        message.error("Renstra aktif belum dipilih");
        return;
      }

      const validStages = IMPORT_DARI_RPJM_MENU.map((m) => m.stage);
      if (!validStages.includes(stage)) {
        message.error("Stage tidak valid");
        return;
      }

      try {
        const res = await api.post("/indikator-renstra/import", {
          stage,
          renstra_id: renstraAktif.id,
          source_doc: "rpjmd",
        });
        message.success(res.data.message || "Import berhasil");
      } catch (err) {
        console.error(err);
        if (err.response?.status === 400) {
          message.error(err.response.data?.error || "Request tidak valid");
        } else if (err.response?.status === 404) {
          message.error(err.response.data?.message || "Data tidak ditemukan");
        } else {
          message.error("Gagal import dari RPJMD");
        }
      }
    },
    [renstraAktif, message]
  );

  const importMenu = {
    items: IMPORT_DARI_RPJM_MENU.map(({ stage, label }) => ({
      key: stage,
      label,
    })),
    onClick: ({ key }) => {
      const label =
        IMPORT_DARI_RPJM_MENU.find((m) => m.stage === key)?.label ?? key;
      modal.confirm({
        title: `Yakin ${label} dari RPJMD?`,
        content: `Data indikator untuk "${key}" dari RPJMD akan dimasukkan ke indikator renstra.`,
        okText: "Ya, Import",
        cancelText: "Batal",
        onOk: () => handleImport(key),
      });
    },
  };

  return (
    <Card
      title={
        <Space direction="vertical">
          <div>
            {initialData
              ? "Edit Indikator Umum Renstra"
              : "Tambah Indikator Umum Renstra"}
          </div>
          <Space wrap>
            <Button onClick={() => navigate("/dashboard-renstra")}>
              🔙 Kembali ke Dashboard
            </Button>
            <Button onClick={() => navigate("/renstra/indikator-umum")}>
              📄 Lihat Daftar Indikator Umum
            </Button>
            <Dropdown
              menu={importMenu}
              placement="bottomLeft"
              disabled={!renstraAktif?.id}
            >
              <Button type="dashed">
                📥 Import dari RPJMD <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </Space>
      }
    >
      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        style={{ maxWidth: 700 }}
      >
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

export default IndikatorUmumRenstraForm;
