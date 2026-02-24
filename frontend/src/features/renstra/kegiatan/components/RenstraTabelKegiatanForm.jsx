import React, { useState, useEffect, useMemo } from "react";
import { Card, Button, Alert, InputNumber } from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FormProvider, Controller } from "react-hook-form";

import InputField from "@/shared/components/form/InputField";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import { createAsyncSchema } from "@/shared/components/utils/renstraTabelKegiatanSchema";
import generatePayloadRenstraTabelKegiatan from "@/shared/components/utils/generatePayloadRenstraTabelKegiatan";
import api from "@/services/api";
import Decimal from "decimal.js";

const RenstraTabelKegiatanForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const [availablePagu, setAvailablePagu] = useState({});
  const [inputPagu, setInputPagu] = useState(() => {
    const init = {};
    for (let i = 1; i <= 6; i++) {
      init[i] = initialData?.[`pagu_tahun_${i}`] || 0;
    }
    return init;
  });
  const [serverWarnings, setServerWarnings] = useState({});
  const [blocked, setBlocked] = useState(false);
  const [schema, setSchema] = useState(null);

  const defaultValues = useMemo(() => {
    const values = {
      program_id: initialData?.program_id ?? null,
      kegiatan_id: initialData?.kegiatan_id ?? null,
      indikator_id: initialData?.indikator_id ?? null,
      baseline: initialData?.baseline ?? "",
      satuan_target: initialData?.satuan_target ?? "",
      lokasi: initialData?.lokasi ?? "",
      bidang_penanggung_jawab: initialData?.bidang_penanggung_jawab ?? "",
      kode_kegiatan: initialData?.kode_kegiatan ?? "",
      nama_kegiatan: initialData?.nama_kegiatan ?? "",
      target_akhir_renstra: initialData?.target_akhir_renstra ?? "",
      pagu_akhir_renstra: initialData?.pagu_akhir_renstra ?? "",
    };
    for (let i = 1; i <= 6; i++) {
      values[`target_tahun_${i}`] = initialData?.[`target_tahun_${i}`] ?? "";
      values[`pagu_tahun_${i}`] = initialData?.[`pagu_tahun_${i}`] ?? 0;
    }
    return values;
  }, [initialData]);

  useEffect(() => {
    setSchema(createAsyncSchema(initialData?.id));
  }, [initialData?.id]);

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/renstra-tabel-kegiatan",
    schema,
    defaultValues,
    queryKeys: ["renstra-tabel-kegiatan"],
    redirectPath: "/renstra/tabel/kegiatan",
    generatePayload: generatePayloadRenstraTabelKegiatan,
    onError: (err) => {
      setServerWarnings(err?.response?.data?.warnings || {});
      setBlocked(err?.response?.data?.blocked || false);
    },
    onSuccess: (res) => {
      setServerWarnings(res?.warnings || {});
      setBlocked(res?.blocked || false);
    },
  });

  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const selectedProgramId = watch("program_id");
  const selectedKegiatanId = watch("kegiatan_id");

  // Fetch options
  const { data: programData } = useQuery({
    queryKey: ["program-options"],
    queryFn: () => api.get("/renstra-tabel-program").then((res) => res.data),
    enabled: !!renstraAktif,
  });
  const { data: kegiatanData } = useQuery({
    queryKey: ["kegiatan-options"],
    queryFn: () => api.get("/renstra-kegiatan").then((res) => res.data),
    enabled: !!renstraAktif,
  });
  const { data: indikatorData } = useQuery({
    queryKey: ["indikator-options"],
    queryFn: () => api.get("/indikator-renstra").then((res) => res.data),
    enabled: !!renstraAktif,
  });

  // Realtime fetch available pagu
  useEffect(() => {
    console.log("=== useEffect availablePagu triggered ===");
    console.log("selectedProgramId:", selectedProgramId);
    console.log("selectedKegiatanId:", selectedKegiatanId);
    console.log("initialData?.id:", initialData?.id);
    console.log("inputPagu:", inputPagu);

    if (!selectedProgramId) {
      console.log("No program selected, clearing availablePagu");
      return setAvailablePagu({});
    }

    const fetchAvailablePagu = async () => {
      try {
        const params = {
          program_id: selectedProgramId,
          exclude_id: initialData?.id || selectedKegiatanId || null,
          input_pagu: JSON.stringify(inputPagu),
        };
        console.log("Calling API with params:", params);

        const res = await api.get("/renstra-tabel-kegiatan/available-pagu", {
          params,
        });
        console.log("API response:", res.data);

        setAvailablePagu(res.data?.available || {});
      } catch (err) {
        console.error("Gagal fetch available pagu:", err);
        setAvailablePagu({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
      }
    };

    fetchAvailablePagu();
  }, [selectedProgramId, selectedKegiatanId, inputPagu, initialData?.id]);

  const handlePaguChange = (tahun, value) => {
    setInputPagu((prev) => ({ ...prev, [tahun]: Number(value || 0) }));
    setValue(`pagu_tahun_${tahun}`, Number(value || 0));
  };

  const numberFormatter = (value) =>
    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const numberParser = (value) => value.replace(/\./g, "");

  // Auto-set bidang/kode/nama kegiatan
  useEffect(() => {
    const sel = kegiatanData?.find(
      (k) => k.id === Number(watch("kegiatan_id"))
    );
    if (!sel) return;
    setValue("bidang_penanggung_jawab", sel.bidang_opd || "");
    setValue("kode_kegiatan", sel.kode_kegiatan || "");
    setValue("nama_kegiatan", sel.nama_kegiatan || "");
  }, [watch("kegiatan_id"), setValue, kegiatanData]);

  // Auto-set indikator
  useEffect(() => {
    const sel = indikatorData?.find(
      (i) => i.id === Number(watch("indikator_id"))
    );
    if (!sel) return;
    if (sel.baseline !== undefined && sel.baseline !== null)
      setValue("baseline", sel.baseline);
    if (sel.satuan) setValue("satuan_target", sel.satuan);
    [1, 2, 3, 4, 5, 6].forEach((i) => {
      const val = sel[`target_tahun_${i}`];
      if (val !== undefined && val !== null) setValue(`target_tahun_${i}`, val);
    });
  }, [watch("indikator_id"), setValue, indikatorData]);

  // Hitung target & pagu akhir
  useEffect(() => {
    const targetSum = [1, 2, 3, 4, 5, 6].reduce(
      (sum, i) => sum.plus(new Decimal(watch(`target_tahun_${i}`) || 0)),
      new Decimal(0)
    );
    const paguSum = [1, 2, 3, 4, 5, 6].reduce(
      (sum, i) => sum.plus(new Decimal(watch(`pagu_tahun_${i}`) || 0)),
      new Decimal(0)
    );
    setValue("target_akhir_renstra", targetSum.div(6).toNumber());
    setValue("pagu_akhir_renstra", paguSum.toNumber());
  }, [
    watch(`target_tahun_1`),
    watch(`target_tahun_2`),
    watch(`target_tahun_3`),
    watch(`target_tahun_4`),
    watch(`target_tahun_5`),
    watch(`target_tahun_6`),
    watch(`pagu_tahun_1`),
    watch(`pagu_tahun_2`),
    watch(`pagu_tahun_3`),
    watch(`pagu_tahun_4`),
    watch(`pagu_tahun_5`),
    watch(`pagu_tahun_6`),
    setValue,
  ]);

  return (
    <Card title={initialData ? "Edit Kegiatan" : "Tambah Kegiatan"}>
      <Button
        onClick={() => navigate("/dashboard-renstra")}
        style={{ marginBottom: 12 }}
      >
        🔙 Kembali
      </Button>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <SelectWithLabelValue
            name="program_id"
            label="Program"
            control={control}
            errors={errors}
            required
            options={(programData || []).map((p) => ({
              label: `${p.kode_program} - ${p.nama_program}`,
              value: p.id,
            }))}
          />

          <SelectWithLabelValue
            name="kegiatan_id"
            label="Kegiatan"
            control={control}
            errors={errors}
            required
            options={(kegiatanData || [])
              .filter((k) => k.program_id === Number(selectedProgramId))
              .map((k) => ({
                label: `${k.kode_kegiatan} - ${k.nama_kegiatan}`,
                value: k.id,
              }))}
          />

          <SelectWithLabelValue
            name="indikator_id"
            label="Indikator"
            control={control}
            errors={errors}
            required
            options={(indikatorData || []).map((i) => ({
              label: i.nama_indikator,
              value: i.id,
            }))}
          />

          <Controller
            name="baseline"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                style={{ width: "100%" }}
                placeholder="Baseline"
                formatter={numberFormatter}
                parser={numberParser}
              />
            )}
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
          <InputField
            name="kode_kegiatan"
            label="Kode Kegiatan"
            control={control}
            errors={errors}
            disabled
          />
          <InputField
            name="nama_kegiatan"
            label="Nama Kegiatan"
            control={control}
            errors={errors}
            disabled
          />
          <InputField
            name="bidang_penanggung_jawab"
            label="Bidang Penanggung Jawab"
            control={control}
            errors={errors}
            disabled
          />

          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card
              key={i}
              size="small"
              title={`📅 Tahun ${i}`}
              style={{ marginBottom: 12 }}
            >
              <Controller
                name={`target_tahun_${i}`}
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    style={{ width: "100%" }}
                    placeholder={`Target Tahun ${i}`}
                    formatter={numberFormatter}
                    parser={numberParser}
                  />
                )}
              />

              <Controller
                name={`pagu_tahun_${i}`}
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    style={{ width: "100%" }}
                    placeholder={`Pagu Tahun ${i}`}
                    formatter={numberFormatter}
                    parser={numberParser}
                    onChange={(value) => handlePaguChange(i, value)}
                  />
                )}
              />

              <div
                style={{
                  fontSize: 12,
                  marginTop: 4,
                  color: availablePagu[i] < 0 ? "red" : "green",
                }}
              >
                Sisa pagu tersedia: {availablePagu[i] ?? 0}
                {availablePagu[i] < 0 && " ⚠️ Pagu kurang!"}
              </div>
            </Card>
          ))}

          {blocked && (
            <Alert
              style={{ marginTop: 12 }}
              message="⚠️ Sisa pagu ada yang kurang. Lengkapi dulu sebelum menambah program/kegiatan baru."
              type="warning"
            />
          )}

          {Object.keys(serverWarnings).length > 0 && (
            <Card
              size="small"
              type="inner"
              title="Peringatan Server"
              style={{ marginTop: 12 }}
            >
              {Object.entries(serverWarnings).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    color: v.includes("kurang")
                      ? "blue"
                      : v.includes("lebih")
                      ? "red"
                      : "green",
                  }}
                >
                  {v}
                </div>
              ))}
            </Card>
          )}

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

          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            💾 Simpan
          </Button>
        </form>
      </FormProvider>
    </Card>
  );
};

export default RenstraTabelKegiatanForm;
