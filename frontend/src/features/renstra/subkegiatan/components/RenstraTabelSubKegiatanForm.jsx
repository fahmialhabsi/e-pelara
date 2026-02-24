// src/features/renstra/subkegiatan/components/RenstraTabelSubKegiatanForm.jsx
import React, { useEffect, useMemo } from "react";
import { Card, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as Yup from "yup";

import api from "@/services/api";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import SpinnerFullscreen from "./RenstraTableSubKegiatanSpinnerFullscreen";

const RenstraTabelSubKegiatanForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();

  // 🔹 Queries
  const { data: programOptions = [], isLoading: loadingProgram } = useQuery({
    queryKey: ["renstra-program", renstraAktif?.id],
    queryFn: async () => {
      const res = await api.get("/renstra-program", {
        params: { renstra_id: renstraAktif?.id },
      });
      return res.data;
    },
    enabled: !!renstraAktif,
  });

  const { data: kegiatanOptions = [], isLoading: loadingKegiatan } = useQuery({
    queryKey: ["renstra-kegiatan", renstraAktif?.id],
    queryFn: async () => {
      const res = await api.get("/renstra-kegiatan", {
        params: { renstra_id: renstraAktif?.id },
      });
      return res.data;
    },
    enabled: !!renstraAktif,
  });

  const { data: subkegiatanOptions = [], isLoading: loadingSub } = useQuery({
    queryKey: ["renstra-subkegiatan", renstraAktif?.id],
    queryFn: async () => {
      const res = await api.get("/renstra-subkegiatan", {
        params: { renstra_id: renstraAktif?.id },
      });
      // Pastikan selalu array
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    },
    enabled: !!renstraAktif,
  });

  const { data: indikatorOptions = [], isLoading: loadingIndikator } = useQuery(
    {
      queryKey: ["indikator-renstra", renstraAktif?.id],
      queryFn: async () => {
        const res = await api.get("/indikator-renstra", {
          params: { renstra_id: renstraAktif?.id },
        });
        return res.data;
      },
      enabled: !!renstraAktif,
    }
  );

  // 🔹 Yup schema
  const schema = () =>
    Yup.object({
      program_id: Yup.string().required("Program wajib dipilih"),
      kegiatan_id: Yup.string().required("Kegiatan wajib dipilih"),
      subkegiatan_id: Yup.string().required("Subkegiatan wajib dipilih"),
      indikator_manual: Yup.string().required("Indikator wajib diisi"),
      baseline: Yup.number()
        .typeError("Harus berupa angka")
        .required("Baseline wajib diisi"),
      satuan_target: Yup.string().required("Satuan target wajib diisi"),
      lokasi: Yup.string().required("Lokasi wajib diisi"),
      kode_subkegiatan: Yup.string().required("Kode subkegiatan wajib diisi"),
      nama_subkegiatan: Yup.string().required("Nama subkegiatan wajib diisi"),
      target_tahun_1: Yup.number().typeError("Harus angka").required(),
      target_tahun_2: Yup.number().typeError("Harus angka").required(),
      target_tahun_3: Yup.number().typeError("Harus angka").required(),
      target_tahun_4: Yup.number().typeError("Harus angka").required(),
      target_tahun_5: Yup.number().typeError("Harus angka").required(),
      target_tahun_6: Yup.number().typeError("Harus angka").required(),
      pagu_tahun_1: Yup.number().typeError("Harus angka").required(),
      pagu_tahun_2: Yup.number().typeError("Harus angka").required(),
      pagu_tahun_3: Yup.number().typeError("Harus angka").required(),
      pagu_tahun_4: Yup.number().typeError("Harus angka").required(),
      pagu_tahun_5: Yup.number().typeError("Harus angka").required(),
      pagu_tahun_6: Yup.number().typeError("Harus angka").required(),
    });

  // 🔹 defaultValues final
  const defaultValues = {
    // Foreign keys (harus string)
    program_id: initialData?.program_id ? String(initialData.program_id) : "",
    kegiatan_id: initialData?.kegiatan_id
      ? String(initialData.kegiatan_id)
      : "",
    subkegiatan_id: initialData?.subkegiatan_id
      ? String(initialData.subkegiatan_id)
      : "",
    renstra_opd_id: initialData?.renstra_opd_id ?? renstraAktif?.id ?? "",

    // Field string
    indikator_manual: initialData?.indikator_manual ?? "",
    kode_subkegiatan: initialData?.kode_subkegiatan ?? "",
    nama_subkegiatan: initialData?.nama_subkegiatan ?? "",
    sub_bidang_penanggung_jawab: initialData?.sub_bidang_penanggung_jawab ?? "",
    satuan_target: initialData?.satuan_target ?? "",
    lokasi: initialData?.lokasi ?? "",

    // Field numeric, default = 0
    baseline: initialData?.baseline ?? 0,
    target_tahun_1: initialData?.target_tahun_1 ?? 0,
    target_tahun_2: initialData?.target_tahun_2 ?? 0,
    target_tahun_3: initialData?.target_tahun_3 ?? 0,
    target_tahun_4: initialData?.target_tahun_4 ?? 0,
    target_tahun_5: initialData?.target_tahun_5 ?? 0,
    target_tahun_6: initialData?.target_tahun_6 ?? 0,
    pagu_tahun_1: initialData?.pagu_tahun_1 ?? 0,
    pagu_tahun_2: initialData?.pagu_tahun_2 ?? 0,
    pagu_tahun_3: initialData?.pagu_tahun_3 ?? 0,
    pagu_tahun_4: initialData?.pagu_tahun_4 ?? 0,
    pagu_tahun_5: initialData?.pagu_tahun_5 ?? 0,
    pagu_tahun_6: initialData?.pagu_tahun_6 ?? 0,
    target_akhir_renstra: initialData?.target_akhir_renstra ?? 0,
    pagu_akhir_renstra: initialData?.pagu_akhir_renstra ?? 0,
  };

  // 🔹 Generate payload final
  const generatePayload = (data) => {
    // Helper: convert ke number aman
    const toNumber = (value, defaultValue = 0) => {
      if (value === "" || value === null || value === undefined)
        return defaultValue;
      const n = Number(value);
      return Number.isNaN(n) ? defaultValue : n;
    };

    // Payload terstruktur
    const payload = {
      // Foreign keys (string sesuai requirement frontend)
      program_id: data.program_id || "",
      kegiatan_id: data.kegiatan_id || "",
      subkegiatan_id: data.subkegiatan_id || "",
      renstra_opd_id: data.renstra_opd_id || "",

      // Field string
      indikator_manual: data.indikator_manual || "",
      kode_subkegiatan: data.kode_subkegiatan || "",
      nama_subkegiatan: data.nama_subkegiatan || "",
      sub_bidang_penanggung_jawab: data.sub_bidang_penanggung_jawab || "",
      satuan_target: data.satuan_target || "",
      lokasi: data.lokasi || "",

      // Field numeric (default aman = 0)
      baseline: toNumber(data.baseline, 0),
      target_tahun_1: toNumber(data.target_tahun_1, 0),
      target_tahun_2: toNumber(data.target_tahun_2, 0),
      target_tahun_3: toNumber(data.target_tahun_3, 0),
      target_tahun_4: toNumber(data.target_tahun_4, 0),
      target_tahun_5: toNumber(data.target_tahun_5, 0),
      target_tahun_6: toNumber(data.target_tahun_6, 0),
      pagu_tahun_1: toNumber(data.pagu_tahun_1, 0),
      pagu_tahun_2: toNumber(data.pagu_tahun_2, 0),
      pagu_tahun_3: toNumber(data.pagu_tahun_3, 0),
      pagu_tahun_4: toNumber(data.pagu_tahun_4, 0),
      pagu_tahun_5: toNumber(data.pagu_tahun_5, 0),
      pagu_tahun_6: toNumber(data.pagu_tahun_6, 0),
      target_akhir_renstra: toNumber(data.target_akhir_renstra, 0),
      pagu_akhir_renstra: toNumber(data.pagu_akhir_renstra, 0),
    };

    // Debug: cek payload sebelum dikirim
    console.log("Payload final dikirim ke backend:", payload);

    return payload;
  };

  // 🔹 Form template
  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/renstra-tabel-subkegiatan",
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-tabel-subkegiatan"],
    redirectPath: "/renstra/tabel/subkegiatan",
    mode: "onChange", // agar isValid update setiap input
  });

  const { control, handleSubmit, setValue, watch, formState } = form;

  // 🔹 Hitung otomatis target & pagu akhir
  const targetValues = watch([
    "target_tahun_1",
    "target_tahun_2",
    "target_tahun_3",
    "target_tahun_4",
    "target_tahun_5",
    "target_tahun_6",
  ]);
  const paguValues = watch([
    "pagu_tahun_1",
    "pagu_tahun_2",
    "pagu_tahun_3",
    "pagu_tahun_4",
    "pagu_tahun_5",
    "pagu_tahun_6",
  ]);

  const targetAkhirRenstra = useMemo(() => {
    const nums = targetValues.map((v) => Number(v) || 0);
    const total = nums.reduce((a, b) => a + b, 0);
    return nums.length > 0 ? (total / nums.length).toFixed(2) : 0;
  }, [targetValues]);

  const paguAkhirRenstra = useMemo(() => {
    const nums = paguValues.map((v) => Number(v) || 0);
    return nums.reduce((a, b) => a + b, 0);
  }, [paguValues]);

  useEffect(() => {
    setValue("target_akhir_renstra", targetAkhirRenstra);
    setValue("pagu_akhir_renstra", paguAkhirRenstra);
  }, [targetAkhirRenstra, paguAkhirRenstra, setValue]);

  // 🔹 Update subkegiatan related fields
  useEffect(() => {
    const selected = subkegiatanOptions.find(
      (s) => String(s.id) === watch("subkegiatan_id")
    );
    if (selected) {
      setValue("kode_subkegiatan", selected.kode_sub_kegiatan || "");
      setValue("nama_subkegiatan", selected.nama_sub_kegiatan || "");
      setValue("sub_bidang_penanggung_jawab", selected.sub_bidang_opd || "");
    }
  }, [watch("subkegiatan_id"), subkegiatanOptions, setValue]);

  useEffect(() => {
    if (!initialData) return;

    // Program
    const programSelected = programOptions.find(
      (p) => p.id === initialData.program?.id
    );
    if (programSelected) setValue("program_id", String(programSelected.id));

    // Kegiatan
    const kegiatanSelected = kegiatanOptions.find(
      (k) => k.id === initialData.kegiatan?.id
    );
    if (kegiatanSelected) setValue("kegiatan_id", String(kegiatanSelected.id));

    // Subkegiatan
    const subkegiatanSelected = subkegiatanOptions.find(
      (s) => s.id === initialData.subkegiatan?.id
    );
    if (subkegiatanSelected)
      setValue("subkegiatan_id", String(subkegiatanSelected.id));
  }, [
    initialData,
    programOptions,
    kegiatanOptions,
    subkegiatanOptions,
    setValue,
  ]);

  const isLoading =
    !renstraAktif ||
    loadingProgram ||
    loadingKegiatan ||
    loadingSub ||
    loadingIndikator;

  return (
    <Card
      title={
        initialData
          ? "Edit Renstra Tabel Subkegiatan"
          : "Tambah Renstra Tabel Subkegiatan"
      }
    >
      {isLoading ? (
        <SpinnerFullscreen tip="Memuat data Renstra..." />
      ) : (
        <>
          <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
            <Button onClick={() => navigate("/dashboard-renstra")}>
              🔙 Kembali
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <SelectWithLabelValue
              name="program_id"
              label="Program"
              control={control}
              errors={formState.errors}
              required
              options={programOptions.map((item) => ({
                label: item.nama_program, // ini yang tampil
                value: String(item.id), // ini yang tersimpan
              }))}
            />

            <SelectWithLabelValue
              name="kegiatan_id"
              label="Kegiatan"
              control={control}
              errors={formState.errors}
              required
              options={kegiatanOptions.map((item) => ({
                label: item.nama_kegiatan,
                value: String(item.id),
              }))}
            />

            <SelectWithLabelValue
              name="subkegiatan_id"
              label="Subkegiatan"
              control={control}
              errors={formState.errors}
              required
              options={subkegiatanOptions.map((item) => ({
                label: item.nama_sub_kegiatan,
                value: String(item.id),
              }))}
            />

            <InputField
              name="indikator_manual"
              label="Indikator"
              control={control}
              errors={formState.errors}
            />
            <InputField
              name="baseline"
              label="Baseline"
              control={control}
              errors={formState.errors}
              type="number"
            />
            <InputField
              name="satuan_target"
              label="Satuan Target"
              control={control}
              errors={formState.errors}
            />
            <InputField
              name="lokasi"
              label="Lokasi"
              control={control}
              errors={formState.errors}
            />
            <InputField
              name="kode_subkegiatan"
              label="Kode Subkegiatan"
              control={control}
              errors={formState.errors}
              disabled
            />
            <InputField
              name="nama_subkegiatan"
              label="Nama Subkegiatan"
              control={control}
              errors={formState.errors}
              disabled
            />
            <InputField
              name="sub_bidang_penanggung_jawab"
              label="Sub Bidang Penanggung Jawab"
              control={control}
              errors={formState.errors}
              disabled
            />

            <h4 style={{ marginTop: 24 }}>Target per Tahun</h4>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <InputField
                key={`target_tahun_${i}`}
                name={`target_tahun_${i}`}
                label={`Target Tahun ${i}`}
                control={control}
                errors={formState.errors}
              />
            ))}

            <h4 style={{ marginTop: 24 }}>Pagu per Tahun</h4>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <InputField
                key={`pagu_tahun_${i}`}
                name={`pagu_tahun_${i}`}
                label={`Pagu Tahun ${i}`}
                control={control}
                errors={formState.errors}
              />
            ))}

            <h4 style={{ marginTop: 24 }}>Kondisi Akhir Renstra</h4>
            <InputField
              name="target_akhir_renstra"
              label="Target Akhir Renstra"
              control={control}
              errors={formState.errors}
              disabled
            />
            <InputField
              name="pagu_akhir_renstra"
              label="Pagu Akhir Renstra"
              control={control}
              errors={formState.errors}
              disabled
            />

            <input
              type="hidden"
              {...form.register("renstra_opd_id")}
              value={defaultValues.renstra_opd_id}
            />

            <div style={{ marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                disabled={isLoading || !formState.isValid || isSubmitting}
              >
                {initialData ? "Update" : "Simpan"}
              </Button>
            </div>
          </form>
        </>
      )}
    </Card>
  );
};

export default RenstraTabelSubKegiatanForm;
