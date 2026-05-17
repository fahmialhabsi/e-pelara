// src/features/renstra/strategi/components/StrategiRenstraForm.jsx

import React from "react";
import { App, Button, Card, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { BsArrowLeftCircle, BsListCheck } from "react-icons/bs";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import TextAreaField from "@/shared/components/form/TextAreaField";
import { useStrategiRenstraForm } from "@/hooks/templatesUseRenstra/useStrategiRenstraForm";
import { Popconfirm } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

const StrategiRenstraForm = ({ initialData = null, renstraAktif }) => {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const {
    form,
    onSubmit,
    isSubmitting,
    isLoading,
    dropdowns,
  } = useStrategiRenstraForm(initialData, renstraAktif);

  const {
    control,
    formState: { errors },
    handleSubmit,
  } = form;

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/renstra-strategi/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renstra-strategi"] });
      navigate("/renstra/strategi");
    },
    onError: () => {
      message.error("Gagal menghapus data strategi");
    },
  });

  const isDeleting = deleteMutation.isLoading;

  const handleDelete = () => {
    if (!initialData?.id) return;
    deleteMutation.mutate(initialData.id);
  };

  // 🔴 Guard jika renstra belum dipilih
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
        initialData
          ? "Edit Strategi Renstra"
          : "Tambah Strategi Renstra"
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Button
          onClick={() => navigate("/dashboard-renstra")}
          icon={<BsArrowLeftCircle />}
        >
          Kembali
        </Button>

        <Button
          onClick={() => navigate("/renstra/strategi")}
          icon={<BsListCheck />}
        >
          Daftar Strategi
        </Button>
      </Space>

      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 700 }}>
        {/* SASARAN */}
        <SelectWithLabelValue
          name="sasaran_id"
          label="Sasaran Renstra"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          disabled={isLoading}
          options={(dropdowns?.["sasaran-renstra"] || []).map((s) => ({
            value: Number(s.id),
            label: `${s.nomor ?? s.kode_sasaran ?? ""} - ${
              s.isi_sasaran ?? s.nama_sasaran ?? ""
            }`.trim(),
          }))}
        />

        {/* STRATEGI RPJMD */}
        <SelectWithLabelValue
          name="strategi_rpjmd_id"
          label="Strategi RPJMD"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          disabled={isLoading}
          options={(dropdowns?.["strategi-rpjmd"] || []).map((s) => ({
            value: Number(s.id),
            label: `${s.kode_strategi ?? ""} - ${
              s.deskripsi ?? ""
            }`.trim(),
          }))}
        />

        {/* KODE STRATEGI */}
        <InputField
          name="no_strategi"
          label="Kode Strategi"
          control={control}
          errors={errors}
          disabled
        />

        {/* DESKRIPSI */}
        <TextAreaField
          name="deskripsi"
          label="Deskripsi Strategi"
          control={control}
          required
        />

        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting || isLoading}
          >
            {initialData ? "Update Strategi" : "Simpan Strategi"}
          </Button>

          {initialData && (
            <Popconfirm
              title="Hapus Strategi?"
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

export default StrategiRenstraForm;