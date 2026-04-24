// src/features/renstra/program/components/RenstraTabelProgramForm.jsx
import React, { useEffect, useMemo } from "react";
import { Card, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as Yup from "yup";

import api from "@/services/api";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import SpinnerFullscreen from "./RenstraTableSpinnerFullscreen";

const RenstraTabelProgramForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();

  // 🔹 Query program
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

  // 🔹 Yup schema
  const schema = () =>
    Yup.object({
      program_id: Yup.string().required("Program wajib dipilih"),
      indikator_id: Yup.string().required("Indikator wajib dipilih"),
      baseline: Yup.number()
        .typeError("Baseline harus angka")
        .required("Baseline wajib diisi"),
      satuan_target: Yup.string().required("Satuan target wajib diisi"),
      lokasi: Yup.string().required("Lokasi wajib diisi"),
      opd_penanggung_jawab: Yup.string().required("OPD wajib diisi"),
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

  // 🔹 Default values
  const defaultValues = {
    program_id: initialData?.program_id ? String(initialData.program_id) : "",
    indikator_id: initialData?.indikator_id
      ? String(initialData.indikator_id)
      : "",
    baseline: initialData?.baseline ?? "",
    satuan_target: initialData?.satuan_target ?? "",
    lokasi: initialData?.lokasi ?? "",
    opd_penanggung_jawab: initialData?.opd_penanggung_jawab ?? "",
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

  // 🔹 Generate payload untuk API
  const generatePayload = (data) => {
    const selectedProgram = programOptions.find(
      (p) => String(p.id) === String(data.program_id)
    );

    // Hitung target & pagu akhir otomatis dari tahun 1–6
    const targetValues = [
      data.target_tahun_1,
      data.target_tahun_2,
      data.target_tahun_3,
      data.target_tahun_4,
      data.target_tahun_5,
      data.target_tahun_6,
    ].map((v) => Number(v) || 0);

    const paguValues = [
      data.pagu_tahun_1,
      data.pagu_tahun_2,
      data.pagu_tahun_3,
      data.pagu_tahun_4,
      data.pagu_tahun_5,
      data.pagu_tahun_6,
    ].map((v) => Number(v) || 0);

    const target_akhir_renstra =
      targetValues.reduce((a, b) => a + b, 0) / targetValues.length || 0;

    const pagu_akhir_renstra = paguValues.reduce((a, b) => a + b, 0);

    return {
      program_id: Number(data.program_id),
      indikator_id: Number(data.indikator_id),
      baseline: data.baseline,
      satuan_target: data.satuan_target,
      lokasi: data.lokasi,
      opd_penanggung_jawab: data.opd_penanggung_jawab,
      nama_program: selectedProgram?.nama_program || "",
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
      target_akhir_renstra,
      pagu_akhir_renstra,
    };
  };

  // 🔹 Form template hook
  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/renstra-tabel-program",
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-tabel-program"],
    redirectPath: "/renstra/tabel/program",
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const selectedProgramId = watch("program_id");
  const selectedIndikatorId = watch("indikator_id");

  // 🔹 Auto set OPD ketika program dipilih
  useEffect(() => {
    if (selectedProgramId) {
      const selected = programOptions.find(
        (p) => String(p.id) === String(selectedProgramId)
      );
      if (selected?.opd_penanggung_jawab) {
        setValue("opd_penanggung_jawab", selected.opd_penanggung_jawab);
      }
    }
  }, [selectedProgramId, programOptions, setValue]);

  // 🔹 Auto set baseline & target hanya untuk form baru
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

  const paguAkhirRenstra = useMemo(() => {
    const nums = paguValues.map((v) => Number(v) || 0);
    return nums.reduce((a, b) => a + b, 0);
  }, [paguValues]);

  useEffect(() => {
    setValue("target_akhir_renstra", targetAkhirRenstra);
    setValue("pagu_akhir_renstra", paguAkhirRenstra);
  }, [targetAkhirRenstra, paguAkhirRenstra, setValue]);

  return (
    <Card
      title={
        initialData
          ? "Edit Renstra Tabel Program"
          : "Tambah Renstra Tabel Program"
      }
    >
      {!renstraAktif || loadingProgram || loadingIndikator ? (
        <SpinnerFullscreen tip="Memuat data Renstra..." />
      ) : (
        <>
          <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
            <Button onClick={() => navigate("/dashboard-renstra")}>
              🔙 Kembali
            </Button>
          </div>

          {programOptions.length === 0 && (
            <div
              style={{
                background: "#fffbe6",
                border: "1px solid #ffe58f",
                borderRadius: 6,
                padding: "10px 16px",
                marginBottom: 16,
                fontSize: 13,
                color: "#614700",
              }}
            >
              ⚠️ <strong>Belum ada Program Renstra.</strong> Tambahkan terlebih dahulu melalui{" "}
              <strong>Aksi Input Data Renstra → Program</strong>, lalu kembali ke halaman ini.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <SelectWithLabelValue
              name="program_id"
              label="Program"
              control={control}
              errors={errors}
              required
              options={programOptions.map((item) => ({
                label: item.nama_program,
                value: String(item.id),
              }))}
            />

            <InputField
              name="opd_penanggung_jawab"
              label="OPD Penanggung Jawab"
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

            {/* 🔹 Target periode */}
            <h4 style={{ marginTop: 24 }}>Target periode (th. ke-1 s/d ke-6)</h4>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <InputField
                key={`target_tahun_${i}`}
                name={`target_tahun_${i}`}
                label={`Target (th. ke-${i})`}
                control={control}
                errors={errors}
              />
            ))}

            {/* 🔹 Pagu periode */}
            <h4 style={{ marginTop: 24 }}>Pagu periode (th. ke-1 s/d ke-6)</h4>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <InputField
                key={`pagu_tahun_${i}`}
                name={`pagu_tahun_${i}`}
                label={`Pagu (th. ke-${i})`}
                control={control}
                errors={errors}
              />
            ))}

            {/* 🔹 Kondisi Akhir Renstra */}
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

export default RenstraTabelProgramForm;
