// src/features/renstra/sasaran/components/SasaranRenstraForm.jsx
import React, { useCallback, useEffect, useState } from "react";
import { App, Button, Card, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { useSasaranRenstraForm } from "@/hooks/templatesUseRenstra/useSasaranRenstraForm";
import api from "@/services/api";
import { BsArrowLeftCircle, BsListCheck } from "react-icons/bs";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import TextAreaField from "@/shared/components/form/TextAreaField";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const SasaranRenstraForm = ({ initialData = null, renstraAktif }) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFormReady, setIsFormReady] = useState(false); // untuk disable input/tombol

  const { form, isLoading, dropdowns } = useSasaranRenstraForm(
    initialData,
    renstraAktif
  );

  const {
    control,
    setValue,
    formState: { errors },
    watch,
    handleSubmit,
  } = form;

  const watchedTujuanId = watch("tujuan_id");

  // Fetch Sasaran RPJMD untuk tujuan terpilih
  const { data: sasaranRpjmdOptionsData = [], isLoading: isSasaranLoading } =
    useQuery({
      queryKey: ["sasaran-rpjmd", watchedTujuanId],
      queryFn: async () => {
        if (!watchedTujuanId) return [];
        const res = await api.get(
          `/renstra-sasaran/sasaran-rpjmd?tujuan_id=${watchedTujuanId}`
        );
        return res.data.data;
      },
      enabled: !!watchedTujuanId,
    });

  const tujuanOptions = Array.isArray(dropdowns?.["renstra-tujuan"])
    ? dropdowns["renstra-tujuan"]
    : [];
  const sasaranRpjmdOptions = sasaranRpjmdOptionsData;

  // Update form values saat Tujuan atau Sasaran RPJMD berubah
  const handleTujuanChange = useCallback(
    (selectedTujuanId) => {
      console.log("Tujuan dipilih:", selectedTujuanId);
      setValue("tujuan_id", selectedTujuanId);
    },
    [setValue]
  );

  const handleSasaranRpjmdChange = useCallback(
    (selectedSasaranId) => {
      console.log("Sasaran RPJMD dipilih:", selectedSasaranId);
      const selected = sasaranRpjmdOptions.find(
        (s) => String(s.id) === String(selectedSasaranId)
      );
      setValue("rpjmd_sasaran_id", selectedSasaranId);
      setValue("nomor", selected?.nomor || "");
      setValue("isi_sasaran", selected?.isi_sasaran || "");
    },
    [sasaranRpjmdOptions, setValue]
  );

  // Pastikan renstra_opd_id otomatis terisi dari renstraAktif
  useEffect(() => {
    if (renstraAktif?.opd_id) {
      setValue("renstra_opd_id", renstraAktif.opd_id);
      console.log("renstra_opd_id otomatis di-set:", renstraAktif.opd_id);
    }
  }, [renstraAktif, setValue]);

  // Aktifkan form ketika data siap
  useEffect(() => {
    if (!isLoading && renstraAktif?.opd_id) {
      setIsFormReady(true);
    }
  }, [isLoading, renstraAktif]);

  // Mutation untuk submit form
  const mutation = useMutation({
    mutationFn: async (payload) => {
      console.log("Payload yang dikirim ke backend:", payload);
      const res = await api.post("/renstra-sasaran", payload);
      return res.data;
    },
    onSuccess: (data) => {
      console.log("Response sukses dari backend:", data);
      message.success("Sasaran berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["renstra-sasaran"] });
      navigate("/renstra/sasaran");
    },
    onError: (error) => {
      console.error("Error saat submit ke backend:", error);
      const msg =
        error?.response?.data?.message ||
        JSON.stringify(error?.response?.data) ||
        "Gagal menyimpan Sasaran";
      message.error(msg);
    },
  });

  // Handler submit form
  const onSubmit = (values) => {
    console.log("Form submitted!", values);
    console.log("=== DEBUG FORM SUBMIT ===");
    console.log("Values:", values);
    console.log("Renstra Aktif:", renstraAktif);

    if (!values.renstra_opd_id) {
      message.warning("Renstra belum siap, tidak bisa disimpan.");
      return;
    }
    mutation.mutate(values);
  };

  useEffect(() => {
    if (renstraAktif?.id) {
      setValue("renstra_id", renstraAktif.id);
      console.log("✅ renstra_id otomatis di-set:", renstraAktif.id);
    } else {
      console.log("⚠️ renstraAktif belum ada, form belum siap");
    }
  }, [renstraAktif, setValue]);

  return (
    <Card
      title={initialData ? "Edit Sasaran Renstra" : "Tambah Sasaran Renstra"}
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
            onClick={() => navigate("/renstra/sasaran")}
          >
            Lihat Daftar Sasaran
          </Button>
        </Space>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 700 }}>
        <SelectWithLabelValue
          name="tujuan_id"
          label="Tujuan Renstra"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          disabled={!isFormReady}
          options={tujuanOptions.map((item) => ({
            value: String(item.id),
            label: `${item.no_tujuan} - ${item.isi_tujuan}`,
          }))}
          onChange={handleTujuanChange}
        />

        <SelectWithLabelValue
          name="rpjmd_sasaran_id"
          label="Sasaran RPJMD"
          control={control}
          errors={errors}
          required
          loading={isSasaranLoading}
          disabled={!isFormReady || !watchedTujuanId}
          options={sasaranRpjmdOptions.map((item) => ({
            value: String(item.id),
            label: `${item.nomor} - ${item.isi_sasaran}`,
          }))}
          onChange={handleSasaranRpjmdChange}
        />

        <InputField
          name="nomor"
          label="Nomor Sasaran"
          control={control}
          errors={errors}
          disabled
        />

        <TextAreaField
          name="isi_sasaran"
          label="Isi Sasaran"
          control={control}
          errors={errors}
          required
          disabled={!isFormReady}
        />

        <div style={{ marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={mutation.isLoading}
            disabled={!isFormReady || mutation.isLoading}
          >
            {initialData ? "Update Sasaran" : "Simpan Sasaran"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default SasaranRenstraForm;
