import React, { useState, useEffect, useMemo, useRef } from "react";
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
      id: initialData?.id,
      /** PK renstra_tabel_program — untuk dropdown & available-pagu */
      tabel_program_id: null,
      /** FK ke renstra_program.id — untuk filter kegiatan & payload API */
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

  const selectedTabelProgramId = watch("tabel_program_id");
  const selectedRenstraProgramId = watch("program_id");
  const selectedKegiatanId = watch("kegiatan_id");
  const selectedIndikatorId = watch("indikator_id");
  const prevTabelProgramId = useRef(undefined);
  const prevProgramIdDirect = useRef(undefined);

  const renstraId = renstraAktif?.id;

  // Fetch options — filter by renstra_id agar hanya data OPD ini yang muncul
  const { data: programData } = useQuery({
    queryKey: ["program-options", renstraId],
    queryFn: () =>
      api
        .get("/renstra-tabel-program", { params: { renstra_id: renstraId } })
        .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),
    enabled: !!renstraId,
  });

  const hasTabelProgramList = useMemo(
    () => (programData || []).length > 0,
    [programData]
  );

  useEffect(() => {
    if (!hasTabelProgramList) {
      setValue("tabel_program_id", null);
    }
  }, [hasTabelProgramList, setValue]);

  /** Fallback: master Program Renstra (scope OPD sama) bila belum ada baris Tabel Program */
  const { data: renstraProgramData } = useQuery({
    queryKey: ["renstra-program-options", renstraId],
    queryFn: () =>
      api
        .get("/renstra-program", { params: { renstra_id: renstraId } })
        .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),
    enabled: !!renstraId,
  });
  const { data: kegiatanData } = useQuery({
    queryKey: ["kegiatan-options", renstraId],
    queryFn: () =>
      api
        .get("/renstra-kegiatan", { params: { renstra_id: renstraId } })
        .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),
    enabled: !!renstraId,
  });
  const { data: indikatorData } = useQuery({
    queryKey: ["indikator-options", renstraId],
    queryFn: () =>
      api
        .get("/indikator-renstra", { params: { renstra_id: renstraId } })
        .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),
    enabled: !!renstraId,
  });

  // Edit: sinkronkan dropdown Program (baris tabel) dari FK program_id yang tersimpan
  useEffect(() => {
    if (!initialData?.id || !programData?.length || initialData?.program_id == null) {
      return;
    }
    const match = programData.find(
      (p) => Number(p.program_id) === Number(initialData.program_id)
    );
    if (match) setValue("tabel_program_id", Number(match.id));
  }, [initialData?.id, initialData?.program_id, programData, setValue]);

  // Realtime fetch available pagu (API mengharapkan PK renstra_tabel_program)
  useEffect(() => {
    if (selectedTabelProgramId == null || selectedTabelProgramId === "") {
      return setAvailablePagu({});
    }

    const fetchAvailablePagu = async () => {
      try {
        const params = {
          program_id: Number(selectedTabelProgramId),
          exclude_id: initialData?.id || null,
          input_pagu: JSON.stringify(inputPagu),
        };

        const res = await api.get("/renstra-tabel-kegiatan/available-pagu", {
          params,
        });

        setAvailablePagu(res.data?.available || {});
      } catch (err) {
        console.error("Gagal fetch available pagu:", err);
        setAvailablePagu({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
      }
    };

    fetchAvailablePagu();
  }, [selectedTabelProgramId, inputPagu, initialData?.id]);

  const handlePaguChange = (slotIndex, value) => {
    setInputPagu((prev) => ({ ...prev, [slotIndex]: Number(value || 0) }));
    setValue(`pagu_tahun_${slotIndex}`, Number(value || 0));
  };

  // Sinkron FK program + isi otomatis dari baris renstra_tabel_program (data RPJMD yang sudah dijadwalkan di tabel)
  useEffect(() => {
    if (selectedTabelProgramId == null || selectedTabelProgramId === "") {
      if (hasTabelProgramList) {
        setValue("program_id", null);
      }
      return;
    }
    if (!programData?.length) return;
    const row = programData.find(
      (p) => Number(p.id) === Number(selectedTabelProgramId)
    );
    if (!row) return;

    setValue("program_id", Number(row.program_id));

    if (initialData?.id) {
      prevTabelProgramId.current = selectedTabelProgramId;
      return;
    }

    if (
      prevTabelProgramId.current !== undefined &&
      prevTabelProgramId.current !== selectedTabelProgramId
    ) {
      setValue("kegiatan_id", null);
      setValue("indikator_id", null);
    }
    prevTabelProgramId.current = selectedTabelProgramId;

    if (row.lokasi != null && String(row.lokasi).trim() !== "") {
      setValue("lokasi", row.lokasi);
    }
    if (row.baseline != null && row.baseline !== "") {
      setValue("baseline", row.baseline);
    }
    if (row.satuan_target) setValue("satuan_target", row.satuan_target);

    for (let i = 1; i <= 6; i++) {
      const t = row[`target_tahun_${i}`];
      const p = row[`pagu_tahun_${i}`];
      if (t != null && t !== "") setValue(`target_tahun_${i}`, t);
      if (p != null && p !== "") setValue(`pagu_tahun_${i}`, Number(p));
    }
    setInputPagu((prev) => {
      const next = { ...prev };
      for (let i = 1; i <= 6; i++) {
        next[i] = Number(row[`pagu_tahun_${i}`] || 0);
      }
      return next;
    });
  }, [
    selectedTabelProgramId,
    programData,
    setValue,
    initialData?.id,
    hasTabelProgramList,
  ]);

  // Mode tanpa Tabel Program: ganti program → reset kegiatan & indikator (tambah)
  useEffect(() => {
    if (hasTabelProgramList) return;
    if (
      selectedRenstraProgramId == null ||
      selectedRenstraProgramId === ""
    ) {
      return;
    }
    if (initialData?.id) {
      prevProgramIdDirect.current = selectedRenstraProgramId;
      return;
    }
    if (
      prevProgramIdDirect.current !== undefined &&
      prevProgramIdDirect.current !== selectedRenstraProgramId
    ) {
      setValue("kegiatan_id", null);
      setValue("indikator_id", null);
    }
    prevProgramIdDirect.current = selectedRenstraProgramId;
  }, [
    hasTabelProgramList,
    selectedRenstraProgramId,
    initialData?.id,
    setValue,
  ]);

  const numberFormatter = (value) =>
    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const numberParser = (value) => value.replace(/\./g, "");

  // Auto-set bidang/kode/nama dari renstra_kegiatan (selaras RPJMD lewat relasi kegiatan)
  useEffect(() => {
    const sel = kegiatanData?.find(
      (k) => Number(k.id) === Number(selectedKegiatanId)
    );
    if (!sel) return;
    setValue("bidang_penanggung_jawab", sel.bidang_opd || "");
    setValue("kode_kegiatan", sel.kode_kegiatan || "");
    setValue("nama_kegiatan", sel.nama_kegiatan || "");
  }, [selectedKegiatanId, setValue, kegiatanData]);

  // Auto-set baseline & target dari indikator Renstra (menimpa nilai dari Program bila ada)
  useEffect(() => {
    const sel = indikatorData?.find(
      (i) => Number(i.id) === Number(selectedIndikatorId)
    );
    if (!sel) return;
    if (sel.baseline !== undefined && sel.baseline !== null)
      setValue("baseline", sel.baseline);
    if (sel.satuan) setValue("satuan_target", sel.satuan);
    [1, 2, 3, 4, 5, 6].forEach((i) => {
      const val = sel[`target_tahun_${i}`];
      if (val !== undefined && val !== null) setValue(`target_tahun_${i}`, val);
    });
  }, [selectedIndikatorId, setValue, indikatorData]);

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
          {hasTabelProgramList ? (
            <SelectWithLabelValue
              name="tabel_program_id"
              label="Program"
              control={control}
              errors={errors}
              required
              valueAsNumber
              options={(programData || []).map((p) => ({
                label: `${p.kode_program} - ${p.nama_program}`,
                value: Number(p.id),
              }))}
            />
          ) : (
            <>
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="Belum ada baris di menu Input Tabel → Program untuk Renstra OPD ini. Pilih program dari master Program Renstra; pagu periode tidak dibatasi oleh Tabel Program."
              />
              <SelectWithLabelValue
                name="program_id"
                label="Program"
                control={control}
                errors={errors}
                required
                valueAsNumber
                options={(renstraProgramData || []).map((p) => ({
                  label: `${p.kode_program} - ${p.nama_program}`,
                  value: Number(p.id),
                }))}
              />
            </>
          )}

          <SelectWithLabelValue
            name="kegiatan_id"
            label="Kegiatan"
            control={control}
            errors={errors}
            required
            valueAsNumber
            options={(kegiatanData || [])
              .filter(
                (k) =>
                  selectedRenstraProgramId != null &&
                  Number(k.program_id) === Number(selectedRenstraProgramId)
              )
              .map((k) => ({
                label: `${k.kode_kegiatan} - ${k.nama_kegiatan}`,
                value: Number(k.id),
              }))}
          />

          <SelectWithLabelValue
            name="indikator_id"
            label="Indikator"
            control={control}
            errors={errors}
            required
            valueAsNumber
            options={(indikatorData || []).map((i) => ({
              label: i.nama_indikator,
              value: Number(i.id),
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
              title={`📅 Th. ke-${i}`}
              style={{ marginBottom: 12 }}
            >
              <Controller
                name={`target_tahun_${i}`}
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    style={{ width: "100%" }}
                    placeholder={`Target (th. ke-${i})`}
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
                    placeholder={`Pagu (th. ke-${i})`}
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
