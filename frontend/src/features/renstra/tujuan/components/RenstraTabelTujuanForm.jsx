// src/features/renstra/tujuan/components/RenstraTabelTujuanForm.jsx
import React, { useEffect, useMemo } from "react";
import { Card, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as Yup from "yup";
import { useParams } from "react-router-dom";

import api from "@/services/api";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import SpinnerFullscreen from "./SpinnerTujuanFullscreen";

const RenstraTabelTujuanForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { tujuanId } = useParams();

  // 🔹 Query indikator
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

  // 🔹 Query tujuan (untuk dropdown)
  const { data: tujuanOptions = [], isLoading: loadingTujuan } = useQuery({
    queryKey: ["renstra-tujuan", renstraAktif?.id],
    queryFn: async () => {
      const res = await api.get("/renstra-tujuan", {
        params: { renstra_id: renstraAktif?.id },
      });
      return res.data;
    },
    enabled: !!renstraAktif,
  });

  // 🔹 Query data tabel tujuan by tujuan_id (pakai endpoint baru)
  const { data: tabelTujuanByTujuan = [], isLoading: loadingTabelTujuan } =
    useQuery({
      queryKey: ["renstra-tabel-tujuan-by-tujuan", tujuanId],
      queryFn: async () => {
        const res = await api.get(
          `/renstra-tabel-tujuan/by-tujuan/${tujuanId}`
        );
        return res.data;
      },
      enabled: !!tujuanId, // hanya jalan kalau param tersedia
    });

  // 🔹 Yup schema
  const schema = () =>
    Yup.object({
      tujuan_id: Yup.string().required("Tujuan wajib dipilih"),
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

  const defaultValues = {
    tujuan_id: initialData?.tujuan_id ? String(initialData.tujuan_id) : "",
    kode_tujuan: initialData?.kode_tujuan ?? "",
    nama_tujuan: initialData?.nama_tujuan ?? "",

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

  const generatePayload = (data) => ({
    tujuan_id: data.tujuan_id,
    kode_tujuan: data.kode_tujuan,
    nama_tujuan: data.nama_tujuan,
    opd_id: renstraAktif?.id,
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
    endpoint: "/renstra-tabel-tujuan",
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-tabel-tujuan"],
    redirectPath: "/renstra/tabel/tujuan",
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  // 🔹 Auto set detail tujuan saat dipilih
  const selectedTujuanId = watch("tujuan_id");
  useEffect(() => {
    if (selectedTujuanId) {
      const selected = tujuanOptions.find(
        (t) => String(t.id) === String(selectedTujuanId)
      );
      if (selected) {
        setValue("kode_tujuan", selected.no_tujuan ?? "");
        setValue("nama_tujuan", selected.isi_tujuan ?? "");
      }
    }
  }, [selectedTujuanId, tujuanOptions, setValue]);

  // 🔹 Auto set baseline & satuan jika indikator dipilih
  const selectedIndikatorId = watch("indikator_id");
  useEffect(() => {
    if (!initialData && selectedIndikatorId) {
      const selected = indikatorOptions.find(
        (i) => String(i.id) === String(selectedIndikatorId)
      );
      if (selected) {
        setValue("baseline", selected.baseline ?? "");
        setValue("satuan_target", selected.satuan ?? "");
        for (let i = 1; i <= 6; i++) {
          setValue(`target_tahun_${i}`, selected[`target_tahun_${i}`] ?? "");
        }
      }
    }
  }, [selectedIndikatorId, indikatorOptions, setValue, initialData]);

  // 🔹 Hitung target_akhir_renstra & pagu_akhir_renstra
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

  const paguAkhirRenstra = useMemo(
    () => paguValues.reduce((a, b) => a + (Number(b) || 0), 0),
    [paguValues]
  );

  useEffect(() => {
    setValue("target_akhir_renstra", targetAkhirRenstra);
    setValue("pagu_akhir_renstra", paguAkhirRenstra);
  }, [targetAkhirRenstra, paguAkhirRenstra, setValue]);

  return (
    <Card
      title={
        initialData
          ? "Edit Renstra Tabel Tujuan"
          : "Tambah Renstra Tabel Tujuan"
      }
    >
      {!renstraAktif ||
      loadingIndikator ||
      loadingTujuan ||
      loadingTabelTujuan ? (
        <SpinnerFullscreen tip="Memuat data..." />
      ) : (
        <>
          <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
            <Button onClick={() => navigate("/dashboard-renstra")}>
              🔙 Kembali
            </Button>
          </div>

          {/* 🔹 Contoh render data hasil query endpoint baru */}
          {tabelTujuanByTujuan.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4>Data Tabel Tujuan (by tujuan_id: {tujuanId})</h4>
              <ul>
                {tabelTujuanByTujuan.map((row) => (
                  <li key={row.id}>
                    {row.kode_tujuan} - {row.nama_tujuan} |{" "}
                    {row.indikator?.nama_indikator}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Dropdown Tujuan */}
            <SelectWithLabelValue
              name="tujuan_id"
              label="Tujuan"
              control={control}
              errors={errors}
              required
              options={tujuanOptions.map((t) => ({
                label: `${t.no_tujuan} - ${t.isi_tujuan}`,
                value: String(t.id),
              }))}
            />

            {/* Field otomatis terisi */}
            <InputField
              name="kode_tujuan"
              label="Kode Tujuan"
              control={control}
              errors={errors}
              disabled
            />
            <InputField
              name="nama_tujuan"
              label="Nama Tujuan"
              control={control}
              errors={errors}
              disabled
            />

            {/* Dropdown Indikator */}
            <SelectWithLabelValue
              name="indikator_id"
              label="Indikator"
              control={control}
              errors={errors}
              required
              options={indikatorOptions.map((item) => ({
                label: item.nama_indikator,
                value: String(item.id),
              }))}
            />

            {/* Input lainnya */}
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

export default RenstraTabelTujuanForm;
