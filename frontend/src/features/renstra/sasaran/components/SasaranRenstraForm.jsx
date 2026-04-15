// src/features/renstra/sasaran/components/SasaranRenstraForm.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
        const raw = res.data?.data ?? res.data;
        return Array.isArray(raw) ? raw : [];
      },
      enabled: !!watchedTujuanId,
    });

  const tujuanOptionsRaw = Array.isArray(dropdowns?.["renstra-tujuan"])
    ? dropdowns["renstra-tujuan"]
    : [];

  // Jika tujuan terpilih tidak ada di GET /renstra-tujuan (filter), Select menampilkan ID mentah.
  // Pakai nested `tujuan` dari GET detail (backend) atau satu baris sintetis agar label ada.
  const tujuanOptions = useMemo(() => {
    const list = [...tujuanOptionsRaw];
    if (!initialData?.id || initialData.tujuan_id == null) return list;
    const tid = String(initialData.tujuan_id);
    if (list.some((t) => String(t.id) === tid)) return list;
    const t = initialData.tujuan;
    if (t && (t.no_tujuan != null || t.isi_tujuan != null)) {
      list.unshift({
        id: t.id ?? initialData.tujuan_id,
        no_tujuan: t.no_tujuan,
        isi_tujuan: t.isi_tujuan,
      });
    }
    return list;
  }, [tujuanOptionsRaw, initialData]);

  const sasaranRpjmdOptions = useMemo(() => {
    const list = [...sasaranRpjmdOptionsData];
    if (!initialData?.id || initialData.rpjmd_sasaran_id == null) return list;
    const sid = String(initialData.rpjmd_sasaran_id);
    if (list.some((s) => String(s.id) === sid)) return list;
    const s = initialData.sasaran_rpjmd;
    if (s) {
      list.unshift({
        id: s.id ?? initialData.rpjmd_sasaran_id,
        nomor: s.nomor,
        kode_sasaran: s.nomor,
        nama_sasaran: s.isi_sasaran,
        isi_sasaran: s.isi_sasaran,
      });
    }
    return list;
  }, [sasaranRpjmdOptionsData, initialData]);

  // Update form values saat Tujuan atau Sasaran RPJMD berubah
  const handleTujuanChange = useCallback(
    (selectedTujuanId) => {
      const v =
        selectedTujuanId === undefined || selectedTujuanId === null
          ? ""
          : String(selectedTujuanId);
      setValue("tujuan_id", v, { shouldValidate: true });
    },
    [setValue]
  );

  const handleSasaranRpjmdChange = useCallback(
    (selectedSasaranId) => {
      const selected = sasaranRpjmdOptions.find(
        (s) => String(s.id) === String(selectedSasaranId)
      );
      const v =
        selectedSasaranId === undefined || selectedSasaranId === null
          ? ""
          : String(selectedSasaranId);
      setValue("rpjmd_sasaran_id", v, { shouldValidate: true });
      setValue("nomor", selected?.nomor || "");
      setValue("isi_sasaran", selected?.isi_sasaran || "");
    },
    [sasaranRpjmdOptions, setValue]
  );

  // Hanya isi renstra_opd_id otomatis saat tambah (bukan edit)
  useEffect(() => {
    if (initialData?.id) return;
    if (renstraAktif?.opd_id) {
      setValue("renstra_opd_id", renstraAktif.opd_id);
    }
  }, [initialData?.id, renstraAktif, setValue]);

  // Aktifkan form ketika renstra aktif ada (opd_id tidak selalu ada di response)
  useEffect(() => {
    if (!isLoading && renstraAktif?.id) {
      setIsFormReady(true);
    }
  }, [isLoading, renstraAktif?.id]);

  // Setelah daftar tujuan terisi, paksa string agar cocok Option (Ant Select)
  useEffect(() => {
    if (!initialData?.id || initialData.tujuan_id == null || !tujuanOptions.length)
      return;
    setValue("tujuan_id", String(initialData.tujuan_id), {
      shouldValidate: false,
    });
  }, [
    initialData?.id,
    initialData?.tujuan_id,
    tujuanOptions.length,
    setValue,
  ]);

  // Setelah daftar Sasaran RPJMD (termasuk fallback dari GET detail) siap, paksa string = Option
  useEffect(() => {
    if (!initialData?.rpjmd_sasaran_id || !sasaranRpjmdOptions.length) return;
    setValue("rpjmd_sasaran_id", String(initialData.rpjmd_sasaran_id), {
      shouldValidate: false,
    });
  }, [
    initialData?.id,
    initialData?.rpjmd_sasaran_id,
    sasaranRpjmdOptions.length,
    setValue,
  ]);

  // Mutation untuk submit form
  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (initialData?.id) {
        const res = await api.put(`/renstra-sasaran/${initialData.id}`, payload);
        return res.data;
      }
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

    // Cek berdasarkan renstraAktif?.id (bukan values.renstra_opd_id yang tidak terdaftar di schema)
    if (!renstraAktif?.id) {
      message.warning("Renstra belum siap, tidak bisa disimpan.");
      return;
    }

    // Sertakan renstra_id dari renstraAktif untuk memastikan terhubung ke Renstra yang benar
    mutation.mutate({
      ...values,
      renstra_id: values.renstra_id || renstraAktif.id,
    });
  };

  useEffect(() => {
    if (initialData?.id) return;
    if (renstraAktif?.id) {
      setValue("renstra_id", renstraAktif.id);
    }
  }, [initialData?.id, renstraAktif, setValue]);

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
            label: `${item.kode_sasaran ?? item.nomor ?? ""} - ${
              item.nama_sasaran ?? item.isi_sasaran ?? ""
            }`.trim(),
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
