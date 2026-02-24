// src/features/renstra/tujuan/components/TujuanRenstraForm.jsx
import React from "react";
import { Form, Button, Card, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { useTujuanRenstraForm } from "@/hooks/templatesUseRenstra/useTujuanRenstraForm";
import { BsArrowLeftCircle, BsListCheck } from "react-icons/bs";
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
    formState: { errors },
  } = form;

  const tujuanOptions = dropdowns?.["tujuan-rpjmd"] || [];

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
        {/* Dropdown Tujuan RPJMD */}
        <SelectWithLabelValue
          name="rpjmd_tujuan_id"
          label="Tujuan RPJMD"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          options={tujuanOptions.map((item) => ({
            value: item.id,
            label: `${item.no_tujuan} - ${item.isi_tujuan}`,
          }))}
          onChange={handleTujuanChange}
        />

        {/* Nomor Tujuan */}
        <InputField
          name="no_tujuan"
          label="Nomor Tujuan"
          control={control}
          errors={errors}
          disabled
        />

        {/* Isi Tujuan */}
        <TextAreaField
          name="isi_tujuan"
          label="Isi Tujuan Renstra"
          control={control}
          errors={errors}
          required
        />

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {initialData ? "Update Tujuan" : "Simpan Tujuan"}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TujuanRenstraForm;
