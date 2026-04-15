// src/features/renstra/strategiKebijakan/components/RenstraTabelStrategiKebijakanForm.jsx
import React, { useEffect, useMemo } from "react";
import { Card, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as Yup from "yup";

import api from "@/services/api";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";

const RenstraTabelStrategiKebijakanForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const renstraId = renstraAktif?.id;

  const { data: strategiOptions = [], isLoading: loadingStrategi } = useQuery({
    queryKey: ["renstra-strategi-opts", renstraId],
    queryFn: async () => {
      const res = await api.get("/renstra-strategi", { params: { renstra_id: renstraId } });
      return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!renstraId,
  });

  const { data: kebijakanOptions = [], isLoading: loadingKebijakan } = useQuery({
    queryKey: ["renstra-kebijakan-opts", renstraId],
    queryFn: async () => {
      const res = await api.get("/renstra-kebijakan", { params: { renstra_id: renstraId } });
      return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!renstraId,
  });

  const schema = () => Yup.object({
    strategi_id: Yup.string().required("Strategi wajib dipilih"),
    kebijakan_id: Yup.string().required("Kebijakan wajib dipilih"),
    indikator: Yup.string().required("Indikator wajib diisi"),
    satuan_target: Yup.string().required("Satuan target wajib diisi"),
    lokasi: Yup.string().required("Lokasi wajib diisi"),
  });

  const defaultValues = {
    renstra_id: renstraId ?? "",
    strategi_id: initialData?.strategi_id ? String(initialData.strategi_id) : "",
    kebijakan_id: initialData?.kebijakan_id ? String(initialData.kebijakan_id) : "",
    kode_strategi: initialData?.kode_strategi ?? "",
    deskripsi_strategi: initialData?.deskripsi_strategi ?? "",
    kode_kebijakan: initialData?.kode_kebijakan ?? "",
    deskripsi_kebijakan: initialData?.deskripsi_kebijakan ?? "",
    indikator: initialData?.indikator ?? "",
    baseline: initialData?.baseline ?? "",
    satuan_target: initialData?.satuan_target ?? "",
    lokasi: initialData?.lokasi ?? renstraAktif?.bidang_opd ?? "",
    opd_penanggung_jawab: initialData?.opd_penanggung_jawab ?? renstraAktif?.nama_opd ?? "",
    ...([1,2,3,4,5,6].reduce((acc, i) => ({
      ...acc,
      [`target_tahun_${i}`]: initialData?.[`target_tahun_${i}`] ?? "",
      [`pagu_tahun_${i}`]: initialData?.[`pagu_tahun_${i}`] ?? "",
    }), {})),
    target_akhir_renstra: initialData?.target_akhir_renstra ?? "",
    pagu_akhir_renstra: initialData?.pagu_akhir_renstra ?? "",
  };

  const generatePayload = (data) => {
    const targets = [1,2,3,4,5,6].map((i) => Number(data[`target_tahun_${i}`]) || 0);
    const pagus   = [1,2,3,4,5,6].map((i) => Number(data[`pagu_tahun_${i}`])   || 0);
    return {
      renstra_id: renstraId,
      strategi_id: Number(data.strategi_id),
      kebijakan_id: Number(data.kebijakan_id),
      kode_strategi: data.kode_strategi,
      deskripsi_strategi: data.deskripsi_strategi,
      kode_kebijakan: data.kode_kebijakan,
      deskripsi_kebijakan: data.deskripsi_kebijakan,
      indikator: data.indikator,
      baseline: data.baseline,
      satuan_target: data.satuan_target,
      lokasi: data.lokasi,
      opd_penanggung_jawab: data.opd_penanggung_jawab,
      ...[1,2,3,4,5,6].reduce((acc, i) => ({
        ...acc,
        [`target_tahun_${i}`]: Number(data[`target_tahun_${i}`]) || 0,
        [`pagu_tahun_${i}`]:   Number(data[`pagu_tahun_${i}`])   || 0,
      }), {}),
      target_akhir_renstra: targets.reduce((a,b)=>a+b,0) / targets.length || 0,
      pagu_akhir_renstra: pagus.reduce((a,b)=>a+b,0),
    };
  };

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/renstra-tabel-strategi-kebijakan",
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-tabel-strategi-kebijakan"],
    redirectPath: "/renstra/tabel/strategi-kebijakan",
  });

  const { control, handleSubmit, setValue, watch, formState: { errors } } = form;

  // Auto-fill deskripsi & kode + indikator dari strategi terpilih
  const selectedStrategiId = watch("strategi_id");
  useEffect(() => {
    if (!selectedStrategiId) return;
    const s = strategiOptions.find((x) => String(x.id) === String(selectedStrategiId));
    if (s) {
      setValue("kode_strategi", s.kode_strategi || "");
      setValue("deskripsi_strategi", s.deskripsi || "");
    }
    // Fetch indikator linked to this strategi untuk auto-fill
    api.get("/renstra-indikator", {
      params: { stage: "strategi", ref_id: selectedStrategiId },
    }).then((res) => {
      const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const ind = rows[0];
      if (!ind) return;
      setValue("indikator", ind.nama_indikator || "");
      setValue("baseline", ind.baseline || "");
      setValue("satuan_target", ind.satuan || "");
      for (let i = 1; i <= 5; i++) {
        setValue(`target_tahun_${i}`, ind[`target_tahun_${i}`] || 0);
      }
    }).catch(() => {/* no indikator linked — user fills manually */});
  }, [selectedStrategiId, strategiOptions, setValue]);

  // Auto-fill deskripsi & kode dari kebijakan terpilih
  const selectedKebijakanId = watch("kebijakan_id");
  useEffect(() => {
    const k = kebijakanOptions.find((x) => String(x.id) === String(selectedKebijakanId));
    if (k) {
      setValue("kode_kebijakan", k.kode_kebjkn || "");
      setValue("deskripsi_kebijakan", k.deskripsi || "");
    }
  }, [selectedKebijakanId, kebijakanOptions, setValue]);

  const targetValues = watch([1,2,3,4,5,6].map((i) => `target_tahun_${i}`));
  const paguValues   = watch([1,2,3,4,5,6].map((i) => `pagu_tahun_${i}`));

  useEffect(() => {
    const nums = targetValues.map((v) => Number(v) || 0);
    setValue("target_akhir_renstra", (nums.reduce((a,b)=>a+b,0) / nums.length).toFixed(2));
  }, [JSON.stringify(targetValues), setValue]);

  useEffect(() => {
    setValue("pagu_akhir_renstra", paguValues.map((v) => Number(v) || 0).reduce((a,b)=>a+b,0));
  }, [JSON.stringify(paguValues), setValue]);

  const isLoading = !renstraAktif || loadingStrategi || loadingKebijakan;

  return (
    <Card title={initialData ? "Edit Tabel Strategi & Kebijakan" : "Tambah Tabel Strategi & Kebijakan"}>
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>🔙 Kembali</Button>
        <Button onClick={() => navigate("/renstra/tabel/strategi-kebijakan")}>📄 Daftar</Button>
      </div>

      {isLoading ? (
        <div>Memuat data...</div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <SelectWithLabelValue name="strategi_id" label="Strategi" control={control} errors={errors} required
            options={strategiOptions.map((s) => ({ label: s.deskripsi || s.kode_strategi, value: String(s.id) }))}
          />
          <InputField name="kode_strategi" label="Kode Strategi" control={control} errors={errors} disabled />
          <InputField name="deskripsi_strategi" label="Deskripsi Strategi" control={control} errors={errors} disabled />

          <SelectWithLabelValue name="kebijakan_id" label="Kebijakan" control={control} errors={errors} required
            options={kebijakanOptions.map((k) => ({ label: k.deskripsi || k.kode_kebjkn, value: String(k.id) }))}
          />
          <InputField name="kode_kebijakan" label="Kode Kebijakan" control={control} errors={errors} disabled />
          <InputField name="deskripsi_kebijakan" label="Deskripsi Kebijakan" control={control} errors={errors} disabled />

          <InputField name="indikator" label="Indikator" control={control} errors={errors} required />
          <InputField name="baseline" label="Baseline" control={control} errors={errors} />
          <InputField name="satuan_target" label="Satuan Target" control={control} errors={errors} required />
          <InputField name="lokasi" label="Lokasi" control={control} errors={errors} required />
          <InputField name="opd_penanggung_jawab" label="OPD Penanggung Jawab" control={control} errors={errors} disabled />

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

          <div style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {initialData ? "Update" : "Simpan"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};

export default RenstraTabelStrategiKebijakanForm;
