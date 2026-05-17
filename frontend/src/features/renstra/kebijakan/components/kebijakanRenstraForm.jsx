// src/features/renstra/kebijakan/components/KebijakanRenstraForm.jsx

import React from "react";
import { Button, Card, Space, App } from "antd";
import { useNavigate } from "react-router-dom";
import { BsArrowLeftCircle, BsListCheck } from "react-icons/bs";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import TextAreaField from "@/shared/components/form/TextAreaField";
import { useKebijakanRenstraForm } from "@/hooks/templatesUseRenstra/useKebijakanRenstraForm";
import { Popconfirm } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

const KebijakanRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const {
    form,
    onSubmit,
    isSubmitting,
    isLoading,
    dropdowns,
    handleArahKebijakanChange,
    handleStrategiChange,
  } = useKebijakanRenstraForm(initialData, renstraAktif);

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/renstra-kebijakan/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renstra-kebijakan"] });
      navigate("/renstra/kebijakan");
    },
    onError: () => {
      message.error("Gagal menghapus data kebijakan");
    },
  });

  const isDeleting = deleteMutation.isLoading;

  const handleDelete = () => {
    if (!initialData?.id) return;
    deleteMutation.mutate(initialData.id);
  };

  const {
    control,
    formState: { errors },
    handleSubmit,
  } = form;

  // 🔴 Guard
  if (!renstraAktif) {
    return (
      <Card>
        <p>Renstra belum dipilih. Silakan pilih Renstra terlebih dahulu.</p>
      </Card>
    );
  }

  return (
    <Card
      title={
        initialData ? "Edit Kebijakan Renstra" : "Tambah Kebijakan Renstra"
      }
      loading={isLoading}
    >
      <Space style={{ marginBottom: 16 }}>
        <Button
          onClick={() => navigate("/dashboard-renstra")}
          icon={<BsArrowLeftCircle />}
        >
          Kembali
        </Button>

        <Button
          onClick={() => navigate("/renstra/kebijakan")}
          icon={<BsListCheck />}
        >
          Daftar Kebijakan
        </Button>
      </Space>

      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 700 }}>
        <SelectWithLabelValue
          name="strategi_id"
          label="Strategi Renstra"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          disabled={isLoading}
          options={(dropdowns?.["renstra-strategi"] || []).map((s) => ({
            value: Number(s.id),
            label: `${s.kode_strategi ?? s.no_strategi ?? ""} - ${
              s.deskripsi ?? ""
            }`.trim(),
          }))}
          onChange={handleStrategiChange}
        />

        <SelectWithLabelValue
          name="rpjmd_arah_id"
          label="Arah Kebijakan RPJMD"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          disabled={isLoading}
          options={(dropdowns?.["arah-kebijakan"] || []).map((a) => ({
            value: Number(a.id),
            label: `${a.kode_arah ?? a.kode_kebijakan ?? ""} - ${
              a.deskripsi ?? ""
            }`.trim(),
          }))}
          onChange={handleArahKebijakanChange}
        />

        <InputField
          name="kode_kebjkn"
          label="Kode Kebijakan"
          control={control}
          errors={errors}
          disabled
        />

        <TextAreaField
          name="deskripsi"
          label="Deskripsi Kebijakan"
          control={control}
          errors={errors}
          required
        />

        <InputField
          name="prioritas"
          label="Prioritas"
          control={control}
          errors={errors}
        />

        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting || isLoading}
          >
            {initialData ? "Update Kebijakan" : "Simpan Kebijakan"}
          </Button>

          {initialData && (
            <Popconfirm
              title="Hapus Kebijakan?"
              description="Data akan dihapus permanen"
              onConfirm={handleDelete}
              okText="Ya, Hapus"
              cancelText="Batal"
            >
              <Button danger loading={isDeleting}>
                Hapus
              </Button>
            </Popconfirm>
          )}
        </Space>
      </form>
    </Card>
  );
};

export default KebijakanRenstraForm;