// src/features/renstra/sasaran/components/RenstraTabelSasaranForm.jsx
import React, { useEffect, useMemo, useRef } from "react";
import { Card, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as Yup from "yup";

import api from "@/services/api";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import SpinnerFullscreen from "./SpinnerSasaranFullscreen";

const RenstraTabelSasaranForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();

  // 🔹 Default Values
  const defaultValues = {
    tujuan_id: initialData?.tujuan_id ?? "",
    sasaran_id: initialData?.sasaran_id ?? "",
    kode_sasaran: initialData?.kode_sasaran ?? "",
    nama_sasaran: initialData?.nama_sasaran ?? "",
    indikator_id: initialData?.indikator_id
      ? String(initialData.indikator_id)
      : "",
    baseline: initialData?.baseline ?? "",
    satuan_target: initialData?.satuan_target ?? "",
    lokasi: initialData?.lokasi ?? "",
    target_tahun_1: initialData?.target_tahun_1 ?? "",
    target_tahun_2: initialData?.target_tahun_2 ?? "",
    target_tahun_3: initialData?.target_tahun_3 ?? "",
    target_tahun_4: initialData?.target_tahun_4 ?? "",
    target_tahun_5: initialData?.target_tahun_5 ?? "",
    target_tahun_6: initialData?.target_tahun_6 ?? "",
    pagu_tahun_1: initialData?.pagu_tahun_1 ?? "",
    pagu_tahun_2: initialData?.pagu_tahun_2 ?? "",
    pagu_tahun_3: initialData?.pagu_tahun_3 ?? "",
    pagu_tahun_4: initialData?.pagu_tahun_4 ?? "",
    pagu_tahun_5: initialData?.pagu_tahun_5 ?? "",
    pagu_tahun_6: initialData?.pagu_tahun_6 ?? "",
    target_akhir_renstra: initialData?.target_akhir_renstra ?? "",
    pagu_akhir_renstra: initialData?.pagu_akhir_renstra ?? "",
  };

  // 🔹 Yup Schema
  const schema = () =>
    Yup.object({
      tujuan_id: Yup.string().required("Tujuan wajib dipilih"),
      sasaran_id: Yup.string().required("Sasaran wajib dipilih"),
      indikator_id: Yup.string().required("Indikator wajib dipilih"),
      baseline: Yup.number().typeError("Baseline harus angka").required(),
      satuan_target: Yup.string().required("Satuan target wajib diisi"),
      lokasi: Yup.string().required("Lokasi wajib diisi"),
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

  const generatePayload = (data) => ({
    tujuan_id: Number(data.tujuan_id),
    sasaran_id: Number(data.sasaran_id),
    kode_sasaran: data.kode_sasaran,
    nama_sasaran: data.nama_sasaran,
    indikator_id: Number(data.indikator_id),
    baseline: data.baseline,
    satuan_target: data.satuan_target,
    lokasi: data.lokasi,
    target_tahun_1: data.target_tahun_1,
    target_tahun_2: data.target_tahun_2,
    target_tahun_3: data.target_tahun_3,
    target_tahun_4: data.target_tahun_4,
    target_tahun_5: data.target_tahun_5,
    target_tahun_6: data.target_tahun_6,
    pagu_tahun_1: data.pagu_tahun_1,
    pagu_tahun_2: data.pagu_tahun_2,
    pagu_tahun_3: data.pagu_tahun_3,
    pagu_tahun_4: data.pagu_tahun_4,
    pagu_tahun_5: data.pagu_tahun_5,
    pagu_tahun_6: data.pagu_tahun_6,
    target_akhir_renstra: data.target_akhir_renstra,
    pagu_akhir_renstra: data.pagu_akhir_renstra,
  });

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/renstra-tabel-sasaran",
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-tabel-sasaran"],
    redirectPath: "/renstra/tabel/sasaran",
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  // 🔹 Watch values
  const selectedTujuanId = watch("tujuan_id");
  const selectedSasaranId = watch("sasaran_id");
  const selectedIndikatorId = watch("indikator_id");
  const prevSasaranIdRef = useRef(undefined);

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

  // 🔹 Indikator Renstra stage sasaran yang `ref_id`-nya merujuk baris indikator RPJMD sasaran terpilih
  const { data: indikatorOptions = [], isLoading: loadingIndikator } = useQuery(
    {
      queryKey: [
        "indikator-renstra",
        renstraAktif?.id,
        "sasaran",
        selectedSasaranId,
      ],
      queryFn: async () => {
        const res = await api.get("/indikator-renstra", {
          params: {
            renstra_id: renstraAktif?.id,
            stage: "sasaran",
            sasaran_id: selectedSasaranId,
          },
        });
        const raw = res.data;
        return Array.isArray(raw) ? raw : raw?.data ?? [];
      },
      enabled: !!renstraAktif?.id && !!selectedSasaranId,
    }
  );

  // 🔹 Query tujuan
  const { data: tujuanOptions = [], isLoading: loadingTujuan } = useQuery({
    queryKey: ["renstra-tujuan"],
    queryFn: async () => {
      const res = await api.get("/renstra-tujuan");
      return res.data;
    },
    enabled: !!renstraAktif,
  });

  // 🔹 Query sasaran by tujuan (dari tabel RenstraSasaran)
  const { data: sasaranOptions = [], isLoading: loadingSasaran } = useQuery({
    queryKey: ["renstra-sasaran", selectedTujuanId],
    queryFn: async () => {
      if (!selectedTujuanId) return [];
      const res = await api.get("/renstra-sasaran/sasaran-rpjmd", {
        params: { tujuan_id: selectedTujuanId },
      });
      return res.data.data;
    },
    enabled: !!renstraAktif && !!selectedTujuanId,
  });

  // 🔹 Reset sasaran & indikator saat tujuan berubah
  useEffect(() => {
    setValue("sasaran_id", "");
    setValue("indikator_id", "");
    prevSasaranIdRef.current = undefined;
  }, [selectedTujuanId, setValue]);

  // 🔹 Saat sasaran berubah (bukan inisialisasi pertama), kosongkan pilihan indikator
  useEffect(() => {
    const cur = selectedSasaranId || undefined;
    const prev = prevSasaranIdRef.current;
    if (prev !== undefined && prev !== cur) {
      setValue("indikator_id", "");
    }
    prevSasaranIdRef.current = cur;
  }, [selectedSasaranId, setValue]);

  // 🔹 Auto isi dari baris Indikator Renstra terpilih (sasaran RPJMD tidak punya lokasi/pagu per tahun)
  useEffect(() => {
    if (initialData || !selectedIndikatorId) return;
    const selected = indikatorOptions.find(
      (i) => String(i.id) === String(selectedIndikatorId)
    );
    if (!selected) return;

    setValue("baseline", selected.baseline ?? "");
    setValue("satuan_target", selected.satuan ?? "");
    setValue(
      "lokasi",
      [selected.lokasi, selected.sumber_data, selected.keterangan]
        .map((x) => (x != null ? String(x).trim() : ""))
        .find(Boolean) ?? ""
    );

    for (let i = 1; i <= 5; i += 1) {
      setValue(`target_tahun_${i}`, selected[`target_tahun_${i}`] ?? "");
    }
    const t6 =
      selected.target_tahun_6 ??
      selected.target_tahun_5 ??
      "";
    setValue("target_tahun_6", t6);

    const paguVal = (i) => {
      const raw = selected[`pagu_tahun_${i}`];
      if (raw === null || raw === undefined || raw === "") return 0;
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    };
    for (let i = 1; i <= 6; i += 1) {
      setValue(`pagu_tahun_${i}`, paguVal(i));
    }
  }, [selectedIndikatorId, indikatorOptions, setValue, initialData]);

  // 🔹 Hitung target_akhir_renstra & pagu_akhir_renstra
  const targetAkhirRenstra = useMemo(() => {
    const nums = targetValues.map((v) => Number(v) || 0);
    const total = nums.reduce((a, b) => a + b, 0);
    return nums.length ? (total / nums.length).toFixed(2) : 0;
  }, [targetValues]);

  const paguAkhirRenstra = useMemo(
    () => paguValues.reduce((a, b) => a + (Number(b) || 0), 0),
    [paguValues]
  );

  useEffect(() => {
    setValue("target_akhir_renstra", targetAkhirRenstra);
    setValue("pagu_akhir_renstra", paguAkhirRenstra);
  }, [targetAkhirRenstra, paguAkhirRenstra, setValue]);

  // 🔹 Auto isi kode & nama sasaran saat dipilih
  useEffect(() => {
    if (selectedSasaranId) {
      const selected = sasaranOptions.find(
        (s) => String(s.id) === String(selectedSasaranId)
      );
      if (selected) {
        setValue("kode_sasaran", selected.nomor ?? "");
        setValue("nama_sasaran", selected.isi_sasaran ?? "");
      }
    }
  }, [selectedSasaranId, sasaranOptions, setValue]);

  return (
    <Card
      title={
        initialData
          ? "Edit Renstra Tabel Sasaran"
          : "Tambah Renstra Tabel Sasaran"
      }
    >
      {!renstraAktif ||
      loadingTujuan ||
      loadingSasaran ||
      (!!selectedSasaranId && loadingIndikator) ? (
        <SpinnerFullscreen tip="Memuat data..." />
      ) : (
        <>
          <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
            <Button onClick={() => navigate("/dashboard-renstra")}>
              🔙 Kembali
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <SelectWithLabelValue
              name="tujuan_id"
              label="Tujuan"
              control={control}
              errors={errors}
              required
              options={tujuanOptions.map((item) => ({
                label: item.isi_tujuan,
                value: String(item.id),
              }))}
            />

            <SelectWithLabelValue
              name="sasaran_id"
              label="Sasaran"
              control={control}
              errors={errors}
              required
              options={sasaranOptions.map((item) => ({
                label: item.isi_sasaran,
                value: String(item.id),
              }))}
            />

            <InputField
              name="kode_sasaran"
              label="Kode Sasaran"
              control={control}
              errors={errors}
              disabled
            />
            <InputField
              name="nama_sasaran"
              label="Nama Sasaran"
              control={control}
              errors={errors}
              disabled
            />

            <SelectWithLabelValue
              name="indikator_id"
              label="Indikator"
              control={control}
              errors={errors}
              required
              disabled={!selectedSasaranId}
              options={indikatorOptions.map((item) => ({
                label: item.nama_indikator,
                value: String(item.id),
              }))}
            />

            <InputField
              name="baseline"
              label="Baseline"
              control={control}
              errors={errors}
            />
            <InputField
              name="satuan_target"
              label="Satuan Target"
              control={control}
              errors={errors}
            />
            <InputField
              name="lokasi"
              label="Lokasi"
              control={control}
              errors={errors}
            />

            <h4 style={{ marginTop: 24 }}>Target per Tahun</h4>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <InputField
                key={`target_tahun_${i}`}
                name={`target_tahun_${i}`}
                label={`Target Tahun ${i}`}
                control={control}
                errors={errors}
              />
            ))}

            <h4 style={{ marginTop: 24 }}>Pagu per Tahun</h4>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <InputField
                key={`pagu_tahun_${i}`}
                name={`pagu_tahun_${i}`}
                label={`Pagu Tahun ${i}`}
                control={control}
                errors={errors}
              />
            ))}

            <h4 style={{ marginTop: 24 }}>
              Kondisi Akhir Kinerja Periode Renstra
            </h4>
            <InputField
              name="target_akhir_renstra"
              label="Target Akhir Renstra"
              control={control}
              errors={errors}
              disabled
            />
            <InputField
              name="pagu_akhir_renstra"
              label="Pagu Akhir Renstra"
              control={control}
              errors={errors}
              disabled
            />

            <div style={{ marginTop: 24 }}>
              <Button type="primary" htmlType="submit" loading={isSubmitting}>
                {initialData ? "Update" : "Simpan"}
              </Button>
            </div>
          </form>
        </>
      )}
    </Card>
  );
};

export default RenstraTabelSasaranForm;
