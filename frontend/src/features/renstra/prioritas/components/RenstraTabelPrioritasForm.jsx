// src/features/renstra/prioritas/components/RenstraTabelPrioritasForm.jsx
import React, { useEffect } from "react";
import { Card, Button, Select, Form } from "antd";
import { Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";

import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import InputField from "@/shared/components/form/InputField";

const JENIS_OPTIONS = [
  { label: "🇮🇩 Prioritas Nasional",  value: "nasional"  },
  { label: "🏛️ Prioritas Daerah",     value: "daerah"    },
  { label: "👤 Prioritas Gubernur",   value: "gubernur"  },
];

const JENIS_LABEL = {
  nasional:  "Prioritas Nasional",
  daerah:    "Prioritas Daerah",
  gubernur:  "Prioritas Gubernur",
};

const RenstraTabelPrioritasForm = ({ initialData = null, renstraAktif, jenisPrioritas }) => {
  const navigate = useNavigate();
  const renstraId = renstraAktif?.id;
  const listPath = `/renstra/tabel/prioritas/${jenisPrioritas || "nasional"}`;

  const schema = () => Yup.object({
    jenis_prioritas: Yup.string().required("Jenis prioritas wajib dipilih"),
    nama_prioritas: Yup.string().required("Nama prioritas wajib diisi"),
    indikator: Yup.string().required("Indikator wajib diisi"),
    satuan_target: Yup.string().required("Satuan target wajib diisi"),
  });

  const defaultValues = {
    renstra_id: renstraId ?? "",
    jenis_prioritas: initialData?.jenis_prioritas ?? jenisPrioritas ?? "nasional",
    nama_prioritas: initialData?.nama_prioritas ?? "",
    kode_prioritas: initialData?.kode_prioritas ?? "",
    indikator: initialData?.indikator ?? "",
    baseline: initialData?.baseline ?? "",
    satuan_target: initialData?.satuan_target ?? "",
    lokasi: initialData?.lokasi ?? "",
    opd_penanggung_jawab: initialData?.opd_penanggung_jawab ?? renstraAktif?.nama_opd ?? "",
    program_terkait: initialData?.program_terkait ?? "",
    kegiatan_terkait: initialData?.kegiatan_terkait ?? "",
    ...[1,2,3,4,5,6].reduce((acc, i) => ({
      ...acc,
      [`target_tahun_${i}`]: initialData?.[`target_tahun_${i}`] ?? "",
      [`pagu_tahun_${i}`]: initialData?.[`pagu_tahun_${i}`] ?? "",
    }), {}),
    target_akhir_renstra: initialData?.target_akhir_renstra ?? "",
    pagu_akhir_renstra: initialData?.pagu_akhir_renstra ?? "",
    keterangan: initialData?.keterangan ?? "",
  };

  const generatePayload = (data) => {
    const targets = [1,2,3,4,5,6].map((i) => Number(data[`target_tahun_${i}`]) || 0);
    const pagus   = [1,2,3,4,5,6].map((i) => Number(data[`pagu_tahun_${i}`])   || 0);
    return {
      renstra_id: renstraId,
      jenis_prioritas: data.jenis_prioritas,
      nama_prioritas: data.nama_prioritas,
      kode_prioritas: data.kode_prioritas,
      indikator: data.indikator,
      baseline: data.baseline,
      satuan_target: data.satuan_target,
      lokasi: data.lokasi,
      opd_penanggung_jawab: data.opd_penanggung_jawab,
      program_terkait: data.program_terkait,
      kegiatan_terkait: data.kegiatan_terkait,
      ...[1,2,3,4,5,6].reduce((acc, i) => ({
        ...acc,
        [`target_tahun_${i}`]: Number(data[`target_tahun_${i}`]) || 0,
        [`pagu_tahun_${i}`]:   Number(data[`pagu_tahun_${i}`])   || 0,
      }), {}),
      target_akhir_renstra: targets.reduce((a,b)=>a+b,0) / targets.length || 0,
      pagu_akhir_renstra: pagus.reduce((a,b)=>a+b,0),
      keterangan: data.keterangan,
    };
  };

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/renstra-tabel-prioritas",
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-tabel-prioritas"],
    redirectPath: listPath,
  });

  const { control, handleSubmit, setValue, watch, formState: { errors } } = form;

  const targetValues = watch([1,2,3,4,5,6].map((i) => `target_tahun_${i}`));
  const paguValues   = watch([1,2,3,4,5,6].map((i) => `pagu_tahun_${i}`));

  useEffect(() => {
    const nums = targetValues.map((v) => Number(v) || 0);
    setValue("target_akhir_renstra", (nums.reduce((a,b)=>a+b,0) / nums.length).toFixed(2));
  }, [JSON.stringify(targetValues), setValue]);

  useEffect(() => {
    setValue("pagu_akhir_renstra", paguValues.map((v) => Number(v) || 0).reduce((a,b)=>a+b,0));
  }, [JSON.stringify(paguValues), setValue]);

  const jenisLabel = JENIS_LABEL[jenisPrioritas] || "Prioritas";

  return (
    <Card title={initialData ? `Edit ${jenisLabel}` : `Tambah ${jenisLabel}`}>
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>🔙 Kembali</Button>
        <Button onClick={() => navigate(listPath)}>📄 Daftar</Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 640 }}>
        {/* Jenis Prioritas (readonly kalau sudah ditentukan dari halaman) */}
        <Form.Item label="Jenis Prioritas" required>
          <Controller
            name="jenis_prioritas"
            control={control}
            render={({ field }) => (
              <Select {...field} options={JENIS_OPTIONS} style={{ width: "100%" }} disabled={!!jenisPrioritas} />
            )}
          />
        </Form.Item>

        <InputField name="nama_prioritas" label="Nama Prioritas" control={control} errors={errors} required />
        <InputField name="kode_prioritas" label="Kode Prioritas" control={control} errors={errors} />
        <InputField name="indikator" label="Indikator" control={control} errors={errors} required />
        <InputField name="baseline" label="Baseline" control={control} errors={errors} />
        <InputField name="satuan_target" label="Satuan Target" control={control} errors={errors} required />
        <InputField name="lokasi" label="Lokasi" control={control} errors={errors} />
        <InputField name="opd_penanggung_jawab" label="OPD Penanggung Jawab" control={control} errors={errors} disabled />
        <InputField name="program_terkait" label="Program Terkait" control={control} errors={errors} />
        <InputField name="kegiatan_terkait" label="Kegiatan Terkait" control={control} errors={errors} />

        <h4 style={{ marginTop: 24 }}>Target per Tahun</h4>
        {[1,2,3,4,5,6].map((i) => (
          <InputField key={`t${i}`} name={`target_tahun_${i}`} label={`Target Tahun ${i}`} control={control} errors={errors} />
        ))}

        <h4 style={{ marginTop: 24 }}>Pagu per Tahun</h4>
        {[1,2,3,4,5,6].map((i) => (
          <InputField key={`p${i}`} name={`pagu_tahun_${i}`} label={`Pagu Tahun ${i}`} control={control} errors={errors} />
        ))}

        <h4 style={{ marginTop: 24 }}>Kondisi Akhir Renstra</h4>
        <InputField name="target_akhir_renstra" label="Target Akhir Renstra" control={control} errors={errors} disabled />
        <InputField name="pagu_akhir_renstra" label="Pagu Akhir Renstra" control={control} errors={errors} disabled />

        <InputField name="keterangan" label="Keterangan" control={control} errors={errors} />

        <div style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {initialData ? "Update" : "Simpan"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default RenstraTabelPrioritasForm;
