// src/features/renstra/tujuan/components/TujuanRenstraForm.jsx
import React, { useEffect } from "react";
import { Form, Button, Card, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { BsArrowLeftCircle, BsListCheck } from "react-icons/bs";

import { useTujuanRenstraForm } from "@/hooks/templatesUseRenstra/useTujuanRenstraForm";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import TextAreaField from "@/shared/components/form/TextAreaField";

const TujuanRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();

  const {
    form,
    onSubmit,
    isSubmitting,
    isLoading,
    dropdowns,
    handleTujuanChange,
  } = useTujuanRenstraForm(initialData, renstraAktif);

  const {
    control,
    setValue,
    formState: { errors },
  } = form;

  const tujuanOptions = dropdowns?.["tujuan-rpjmd"] || [];

  useEffect(() => {
    if (
      !initialData ||
      initialData.rpjmd_tujuan_id == null ||
      !tujuanOptions.length
    ) {
      return;
    }

    setValue("rpjmd_tujuan_id", Number(initialData.rpjmd_tujuan_id), {
      shouldValidate: false,
    });
  }, [
    initialData,
    initialData?.rpjmd_tujuan_id,
    tujuanOptions.length,
    setValue,
  ]);

  if (!renstraAktif) {
    return (
      <Card>
        <p>Renstra belum dipilih. Silakan pilih Renstra terlebih dahulu.</p>
      </Card>
    );
  }

  return (
    <Card
      title={initialData ? "Edit Tujuan Renstra" : "Tambah Tujuan Renstra"}
      loading={isLoading}
    >
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<BsArrowLeftCircle />}
            onClick={() => navigate("/dashboard-renstra")}
          >
            Kembali ke Dashboard
          </Button>

          <Button
            icon={<BsListCheck />}
            onClick={() => navigate("/renstra/tujuan")}
          >
            Lihat Daftar Tujuan Renstra
          </Button>
        </Space>
      </div>

      <Form
        layout="vertical"
        onFinish={form.handleSubmit(onSubmit)}
        style={{ maxWidth: 700 }}
      >
        <SelectWithLabelValue
          name="rpjmd_tujuan_id"
          label="Tujuan RPJMD"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          disabled={isLoading}
          options={tujuanOptions.map((item) => ({
            value: Number(item.id),
            label: `${item.no_tujuan ?? ""} - ${item.isi_tujuan ?? ""}`.trim(),
          }))}
          onChange={handleTujuanChange}
        />

        <InputField
          name="no_tujuan"
          label="Nomor Tujuan"
          control={control}
          errors={errors}
          disabled
        />

        <TextAreaField
          name="isi_tujuan"
          label="Isi Tujuan Renstra"
          control={control}
          errors={errors}
          required
        />

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            disabled={isLoading}
          >
            {initialData ? "Update Tujuan" : "Simpan Tujuan"}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TujuanRenstraForm;