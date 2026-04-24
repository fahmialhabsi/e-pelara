// src/features/renstra/subkegiatan/components/RenstraTabelSubKegiatanForm.jsx
import React, { useCallback, useEffect, useMemo } from "react";
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

  // 🔹 Yup — wajib hanya hierarki Program / Kegiatan / Subkegiatan; sisanya opsional (isi otomatis/manual).
  const schema = () => {
    const num = (def = 0) =>
      Yup.number()
        .transform((_, orig) => {
          if (orig === "" || orig === null || orig === undefined) return def;
          const n = Number(orig);
          return Number.isFinite(n) ? n : def;
        })
        .default(def);

    return Yup.object({
      program_id: Yup.string().required("Program wajib dipilih"),
      kegiatan_id: Yup.string().required("Kegiatan wajib dipilih"),
      subkegiatan_id: Yup.string().required("Subkegiatan wajib dipilih"),
      indikator_manual: Yup.string().default(""),
      baseline: num(0),
      satuan_target: Yup.string().default(""),
      lokasi: Yup.string().default(""),
      kode_subkegiatan: Yup.string().default(""),
      nama_subkegiatan: Yup.string().default(""),
      target_tahun_1: num(0),
      target_tahun_2: num(0),
      target_tahun_3: num(0),
      target_tahun_4: num(0),
      target_tahun_5: num(0),
      target_tahun_6: num(0),
      pagu_tahun_1: num(0),
      pagu_tahun_2: num(0),
      pagu_tahun_3: num(0),
      pagu_tahun_4: num(0),
      pagu_tahun_5: num(0),
      pagu_tahun_6: num(0),
      target_akhir_renstra: num(0),
      pagu_akhir_renstra: num(0),
    });
  };

  // 🔹 defaultValues
  const defaultValues = {
    program_id: initialData?.program_id ? String(initialData.program_id) : "",
    kegiatan_id: initialData?.kegiatan_id ? String(initialData.kegiatan_id) : "",
    subkegiatan_id: initialData?.subkegiatan_id ? String(initialData.subkegiatan_id) : "",
    renstra_opd_id: initialData?.renstra_opd_id ?? renstraAktif?.id ?? "",
    indikator_manual: initialData?.indikator_manual ?? "",
    kode_subkegiatan: initialData?.kode_subkegiatan ?? "",
    nama_subkegiatan: initialData?.nama_subkegiatan ?? "",
    sub_bidang_penanggung_jawab: initialData?.sub_bidang_penanggung_jawab ?? "",
    satuan_target: initialData?.satuan_target ?? "",
    lokasi: initialData?.lokasi ?? "",
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

  // 🔹 Payload generator
  const generatePayload = (data) => {
    const toNumber = (v, def = 0) => {
      if (v === "" || v === null || v === undefined) return def;
      const n = Number(v);
      return Number.isNaN(n) ? def : n;
    };
    return {
      program_id: data.program_id || "",
      kegiatan_id: data.kegiatan_id || "",
      subkegiatan_id: data.subkegiatan_id || "",
      renstra_opd_id: data.renstra_opd_id || "",
      indikator_manual: data.indikator_manual || "",
      kode_subkegiatan: data.kode_subkegiatan || "",
      nama_subkegiatan: data.nama_subkegiatan || "",
      sub_bidang_penanggung_jawab: data.sub_bidang_penanggung_jawab || "",
      satuan_target: data.satuan_target || "",
      lokasi: data.lokasi || "",
      baseline: toNumber(data.baseline),
      target_tahun_1: toNumber(data.target_tahun_1),
      target_tahun_2: toNumber(data.target_tahun_2),
      target_tahun_3: toNumber(data.target_tahun_3),
      target_tahun_4: toNumber(data.target_tahun_4),
      target_tahun_5: toNumber(data.target_tahun_5),
      target_tahun_6: toNumber(data.target_tahun_6),
      pagu_tahun_1: toNumber(data.pagu_tahun_1),
      pagu_tahun_2: toNumber(data.pagu_tahun_2),
      pagu_tahun_3: toNumber(data.pagu_tahun_3),
      pagu_tahun_4: toNumber(data.pagu_tahun_4),
      pagu_tahun_5: toNumber(data.pagu_tahun_5),
      pagu_tahun_6: toNumber(data.pagu_tahun_6),
      target_akhir_renstra: toNumber(data.target_akhir_renstra),
      pagu_akhir_renstra: toNumber(data.pagu_akhir_renstra),
    };
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
    mode: "onChange",
  });

  const { control, handleSubmit, setValue, watch, formState } = form;

  const selectedProgramId = watch("program_id");
  const selectedKegiatanId = watch("kegiatan_id");
  const selectedSubkegiatanId = watch("subkegiatan_id");

  /** Tahun master RPJMD (sub_kegiatan / indikator memakai kolom tahun numerik). */
  const tahunRpjmd = useMemo(() => {
    const y = Number(renstraAktif?.tahun_mulai);
    return Number.isFinite(y) && y > 0 ? y : new Date().getFullYear();
  }, [renstraAktif?.tahun_mulai]);

  // 🔹 1) Load Program (filtered by renstra_id)
  const { data: programList = [], isLoading: loadingProgram } = useQuery({
    queryKey: ["renstra-program", renstraAktif?.id],
    queryFn: async () => {
      const res = await api.get("/renstra-program", {
        params: { renstra_id: renstraAktif?.id },
      });
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: !!renstraAktif?.id,
  });

  // 🔹 2) Load Kegiatan (filtered by program_id, cascades when program changes)
  const { data: kegiatanList = [], isLoading: loadingKegiatan } = useQuery({
    queryKey: ["renstra-kegiatan-cascade", renstraAktif?.id, selectedProgramId],
    queryFn: async () => {
      const params = { renstra_id: renstraAktif?.id };
      if (selectedProgramId) params.program_id = selectedProgramId;
      const res = await api.get("/renstra-kegiatan", { params });
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: !!renstraAktif?.id && !!selectedProgramId,
  });

  const selectedKegRow = useMemo(
    () => kegiatanList.find((k) => String(k.id) === String(selectedKegiatanId)),
    [kegiatanList, selectedKegiatanId]
  );

  const rpjmdKegiatanId = useMemo(() => {
    const raw =
      selectedKegRow?.rpjmd_kegiatan_id ?? selectedKegRow?.kegiatan_rpjmd?.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [selectedKegRow]);

  // 🔹 3) Sub kegiatan master RPJMD (ID = PK sub_kegiatan; wajib agar create memakai SubKegiatan.findByPk di backend)
  const { data: subkegiatanList = [], isLoading: loadingSub } = useQuery({
    queryKey: ["master-sub-kegiatan-by-rpjmd-kegiatan", rpjmdKegiatanId, tahunRpjmd],
    queryFn: async () => {
      const res = await api.get(`/sub-kegiatan/by-kegiatan/${rpjmdKegiatanId}`, {
        params: { tahun: tahunRpjmd },
      });
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    },
    enabled: !!rpjmdKegiatanId && !!tahunRpjmd,
  });

  // 🔹 Reset downstream when parent changes
  const clearDerivedSubFields = useCallback(() => {
    setValue("subkegiatan_id", "");
    setValue("kode_subkegiatan", "");
    setValue("nama_subkegiatan", "");
    setValue("sub_bidang_penanggung_jawab", "");
    setValue("indikator_manual", "");
    setValue("baseline", 0);
    setValue("satuan_target", "");
    setValue("lokasi", "");
    for (let i = 1; i <= 6; i += 1) {
      setValue(`target_tahun_${i}`, 0);
      setValue(`pagu_tahun_${i}`, 0);
    }
  }, [setValue]);

  useEffect(() => {
    if (!initialData) {
      setValue("kegiatan_id", "");
      clearDerivedSubFields();
    }
  }, [selectedProgramId, initialData, setValue, clearDerivedSubFields]);

  useEffect(() => {
    if (!initialData) {
      clearDerivedSubFields();
    }
  }, [selectedKegiatanId, initialData, clearDerivedSubFields]);

  // 🔹 Isi otomatis dari master sub_kegiatan + indikator RPJMD (hanya mode tambah)
  useEffect(() => {
    if (initialData || !selectedSubkegiatanId || !tahunRpjmd) return;

    const parseNum = (v) => {
      if (v === null || v === undefined || v === "") return 0;
      const n = parseFloat(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    };

    let cancelled = false;
    (async () => {
      try {
        const [subRes, indRes] = await Promise.all([
          api.get(`/sub-kegiatan/${selectedSubkegiatanId}`),
          api.get("/indikator-sub-kegiatan/by-sub-kegiatan", {
            params: {
              sub_kegiatan_id: selectedSubkegiatanId,
              jenis_dokumen: "rpjmd",
              tahun: String(tahunRpjmd),
              perPage: 50,
            },
          }),
        ]);
        if (cancelled) return;

        const sub = subRes.data?.data ?? subRes.data;
        const indPayload = indRes.data?.data;
        const indRows = Array.isArray(indPayload)
          ? indPayload
          : Array.isArray(indRes.data)
            ? indRes.data
            : [];
        const first = indRows[0] || null;

        if (sub) {
          setValue("kode_subkegiatan", sub.kode_sub_kegiatan || "");
          setValue("nama_subkegiatan", sub.nama_sub_kegiatan || "");
          setValue("sub_bidang_penanggung_jawab", sub.sub_bidang_opd || "");
        }

        if (first) {
          const indLabel =
            first.nama_indikator || first.kode_indikator || "";
          setValue("indikator_manual", indLabel);
          setValue("baseline", parseNum(first.baseline ?? first.target_awal));
          setValue("satuan_target", first.satuan || "");
          setValue(
            "lokasi",
            first.sumber_data ||
              first.keterangan ||
              sub?.nama_opd ||
              ""
          );
          for (let i = 1; i <= 5; i += 1) {
            setValue(`target_tahun_${i}`, parseNum(first[`target_tahun_${i}`]));
          }
          const t5 = parseNum(first.target_tahun_5);
          setValue("target_tahun_6", t5);
        } else {
          setValue("indikator_manual", "");
          setValue("baseline", 0);
          setValue("satuan_target", "");
          setValue("lokasi", sub?.nama_opd || "");
          for (let i = 1; i <= 6; i += 1) {
            setValue(`target_tahun_${i}`, 0);
          }
        }

        const fromSub = Number(sub?.pagu_anggaran ?? sub?.total_pagu_anggaran ?? 0) || 0;
        const fromInd = parseNum(first?.anggaran);
        const totalPagu = Math.round(Number(fromSub || fromInd) || 0);
        // RPJMD hanya punya pagu/anggaran total — tidak ada pagu_tahun_1..6; bagi rata ke 6 tahun Renstra.
        const base = Math.floor(totalPagu / 6);
        const rem = totalPagu - base * 6;
        for (let i = 1; i <= 6; i += 1) {
          setValue(`pagu_tahun_${i}`, base + (i <= rem ? 1 : 0));
        }
      } catch {
        /* biarkan pengguna mengisi manual */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialData, selectedSubkegiatanId, tahunRpjmd, setValue]);

  // 🔹 Pre-select saat edit
  useEffect(() => {
    if (!initialData) return;
    if (initialData.program_id) setValue("program_id", String(initialData.program_id));
    if (initialData.kegiatan_id) setValue("kegiatan_id", String(initialData.kegiatan_id));
    if (initialData.subkegiatan_id) setValue("subkegiatan_id", String(initialData.subkegiatan_id));
  }, [initialData, setValue]);

  // 🔹 Hitung otomatis target & pagu akhir
  const targetValues = watch(["target_tahun_1","target_tahun_2","target_tahun_3","target_tahun_4","target_tahun_5","target_tahun_6"]);
  const paguValues = watch(["pagu_tahun_1","pagu_tahun_2","pagu_tahun_3","pagu_tahun_4","pagu_tahun_5","pagu_tahun_6"]);

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

  const isLoading = !renstraAktif || loadingProgram;

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
            {/* Level 1: Program */}
            <SelectWithLabelValue
              name="program_id"
              label="Program"
              control={control}
              errors={formState.errors}
              required
              options={programList.map((item) => ({
                label: `${item.kode_program} - ${item.nama_program}`,
                value: String(item.id),
              }))}
            />

            {/* Level 2: Kegiatan (cascade dari Program) */}
            <SelectWithLabelValue
              name="kegiatan_id"
              label="Kegiatan"
              control={control}
              errors={formState.errors}
              required
              disabled={!selectedProgramId || loadingKegiatan}
              options={kegiatanList.map((item) => ({
                label: `${item.kode_kegiatan || ""} - ${item.nama_kegiatan}`,
                value: String(item.id),
              }))}
            />

            {/* Level 3: SubKegiatan (cascade dari Kegiatan) */}
            <SelectWithLabelValue
              name="subkegiatan_id"
              label="Subkegiatan"
              control={control}
              errors={formState.errors}
              required
              disabled={!selectedKegiatanId || !rpjmdKegiatanId || loadingSub}
              options={subkegiatanList.map((item) => ({
                label: `${item.kode_sub_kegiatan || ""} - ${item.nama_sub_kegiatan}`,
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

            <h4 style={{ marginTop: 24 }}>Target periode (th. ke-1 s/d ke-6)</h4>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <InputField
                key={`target_tahun_${i}`}
                name={`target_tahun_${i}`}
                label={`Target (th. ke-${i})`}
                control={control}
                errors={formState.errors}
                type="number"
              />
            ))}

            <h4 style={{ marginTop: 24 }}>Pagu periode (th. ke-1 s/d ke-6)</h4>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <InputField
                key={`pagu_tahun_${i}`}
                name={`pagu_tahun_${i}`}
                label={`Pagu (th. ke-${i})`}
                control={control}
                errors={formState.errors}
                type="number"
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
