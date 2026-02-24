// src/features/renstra/kebijakan/components/kebijakanRenstraForm.jsx
import React, { useCallback, useEffect } from "react";
import { Form, Button, Card, Space, App } from "antd";
import { useNavigate } from "react-router-dom";
import { useKebijakanRenstraForm } from "@/hooks/templatesUseRenstra/useKebijakanRenstraForm";
import { BsArrowLeftCircle, BsListCheck } from "react-icons/bs";

import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import TextAreaField from "@/shared/components/form/TextAreaField";

const KebijakanRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const {
    form,
    onSubmit,
    isSubmitting,
    isLoading,
    dropdowns,
    triggerKodeOtomatis,
  } = useKebijakanRenstraForm(initialData, renstraAktif);

  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  // ✅ Pastikan dropdowns selalu array
  const strategiOptions = Array.isArray(dropdowns?.["renstra-strategi"])
    ? dropdowns["renstra-strategi"]
    : [];
  const arahKebijakanOptions = Array.isArray(dropdowns?.["arah-kebijakan"])
    ? dropdowns["arah-kebijakan"]
    : [];

  const handleArahKebijakanChange = useCallback(
    (value) => {
      const selected = arahKebijakanOptions.find((item) => item.id === value);
      setValue("no_arah_rpjmd", selected?.kode_arah || "");
      setValue("isi_arah_rpjmd", selected?.deskripsi || "");
      setValue("jenisDokumen", selected?.jenisDokumen || "");
      setValue("tahun", selected?.tahun || "");
    },
    [arahKebijakanOptions, setValue]
  );

  useEffect(() => {
    if (!initialData && renstraAktif?.id) {
      setValue("kode_kebjkn", "");
    } else if (initialData) {
      setValue("kode_kebjkn", initialData.kode_kebjkn);
      setValue("strategi_id", initialData.strategi_id);
      setValue("rpjmd_arah_id", initialData.rpjmd_arah_id);
      setValue("deskripsi", initialData.deskripsi);
      setValue("prioritas", initialData.prioritas);
      setValue("no_arah_rpjmd", initialData.no_arah_rpjmd);
      setValue("isi_arah_rpjmd", initialData.isi_arah_rpjmd);
      setValue("jenisDokumen", initialData.jenisDokumen);
      setValue("tahun", initialData.tahun);
      setValue("renstra_id", initialData.renstra_id);
    }
  }, [initialData, renstraAktif?.id, setValue]);

  useEffect(() => {
    const strategiId = watch("strategi_id");
    if (
      !initialData &&
      strategiId &&
      strategiOptions.length > 0 &&
      triggerKodeOtomatis
    ) {
      triggerKodeOtomatis(strategiId);
    }
  }, [
    watch("strategi_id"),
    strategiOptions,
    triggerKodeOtomatis,
    initialData,
    setValue,
  ]);

  return (
    <Card
      title={
        initialData ? "Edit Kebijakan Renstra" : "Tambah Kebijakan Renstra"
      }
      loading={isLoading}
    >
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<BsArrowLeftCircle />}
            onClick={() => navigate("/dashboard-renstra")}
          >
            Kembali
          </Button>
          <Button
            icon={<BsListCheck />}
            onClick={() => navigate("/renstra/kebijakan")}
          >
            Lihat Daftar
          </Button>
        </Space>
      </div>

      <Form
        layout="vertical"
        onFinish={form.handleSubmit(onSubmit)}
        style={{ maxWidth: 700 }}
      >
        <SelectWithLabelValue
          name="strategi_id"
          label="Strategi Renstra"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          options={strategiOptions.map((item) => ({
            value: item.id,
            label: `${item.kode_strategi} - ${item.deskripsi}`,
          }))}
          onChange={(val) => {
            setValue("strategi_id", val);
            if (!initialData && triggerKodeOtomatis) triggerKodeOtomatis(val);
          }}
        />

        <SelectWithLabelValue
          name="rpjmd_arah_id"
          label="Arah Kebijakan RPJMD"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          options={arahKebijakanOptions.map((item) => ({
            value: item.id,
            label: `${item.kode_arah} - ${item.deskripsi}`,
          }))}
          onChange={handleArahKebijakanChange}
        />

        <InputField
          name="kode_kebjkn"
          label="Nomor Kebijakan (Kode)"
          control={control}
          errors={errors}
          disabled
        />

        <TextAreaField
          name="deskripsi"
          label="Isi Kebijakan Renstra"
          control={control}
          errors={errors}
          required
        />

        <SelectWithLabelValue
          name="prioritas"
          label="Prioritas"
          control={control}
          errors={errors}
          required
          options={[
            { value: "Tinggi", label: "Tinggi" },
            { value: "Sedang", label: "Sedang" },
            { value: "Rendah", label: "Rendah" },
          ]}
        />

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {initialData ? "Update Kebijakan" : "Simpan Kebijakan"}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default KebijakanRenstraForm;
