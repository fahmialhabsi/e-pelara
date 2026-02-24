import React, { useEffect, useMemo } from "react";
import { Form, Button, Card, Space, App } from "antd";
import { useNavigate } from "react-router-dom";
import { Controller } from "react-hook-form";
import { BsArrowLeftCircle, BsListCheck } from "react-icons/bs";
import { useStrategiRenstraForm } from "@/hooks/templatesUseRenstra/useStrategiRenstraForm";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import TextAreaField from "@/shared/components/form/TextAreaField";

const StrategiRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const {
    form,
    onSubmit,
    isSubmitting,
    isLoading,
    dropdowns,
    handleStrategiChange,
  } = useStrategiRenstraForm(initialData, renstraAktif);

  const {
    control,
    watch,
    getValues,
    formState: { errors },
  } = form;

  useEffect(() => {
    const subscription = watch((values) => {
      console.log(values);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const strategiOptions = dropdowns?.["strategi-rpjmd"] || [];
  const sasaranOptions = dropdowns?.["sasaran-renstra"] || [];

  const mergedStrategiOptions = useMemo(() => {
    const list = [...strategiOptions];
    const exists = list.find((s) => s.id === initialData?.rpjmd_strategi_id);

    if (!exists && initialData?.no_rpjmd && initialData?.isi_strategi_rpjmd) {
      list.unshift({
        id: initialData.rpjmd_strategi_id,
        kode_strategi: initialData.no_rpjmd,
        deskripsi: initialData.isi_strategi_rpjmd,
      });
    }

    return list;
  }, [strategiOptions, initialData]);

  const handleSubmit = async () => {
    await form.handleSubmit(onSubmit)();
  };

  return (
    <Card
      title={initialData ? "Edit Strategi Renstra" : "Tambah Strategi Renstra"}
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
            onClick={() => navigate("/renstra/strategi")}
          >
            Lihat Daftar Strategi
          </Button>
        </Space>
      </div>

      <Form layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 700 }}>
        <SelectWithLabelValue
          name="sasaran_id"
          label="Sasaran Renstra"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          options={sasaranOptions.map((item) => ({
            value: item.id,
            label: `${item.nomor} - ${item.isi_sasaran}`,
          }))}
        />

        <SelectWithLabelValue
          name="strategi_rpjmd_id"
          label="Strategi RPJMD"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          options={mergedStrategiOptions.map((item) => ({
            value: item.id,
            label: `${item.kode_strategi} - ${item.deskripsi}`,
          }))}
          onChange={handleStrategiChange}
        />

        <InputField
          name="no_strategi"
          label="Nomor Strategi Renstra"
          control={control}
          errors={errors}
          disabled
        />

        <TextAreaField
          name="deskripsi"
          label="Deskripsi Strategi Renstra"
          control={control}
          errors={errors}
          required
        />

        <Controller
          name="no_rpjmd"
          control={control}
          render={({ field }) => <input type="hidden" {...field} />}
        />

        <Controller
          name="isi_strategi_rpjmd"
          control={control}
          render={({ field }) => <input type="hidden" {...field} />}
        />

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {initialData ? "Update Strategi" : "Simpan Strategi"}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default StrategiRenstraForm;
