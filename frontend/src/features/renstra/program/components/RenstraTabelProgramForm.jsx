// src/features/renstra/program/components/RenstraTabelProgramForm.jsx
import React, { useEffect, useMemo, useRef } from "react";
import { Card, Button, Alert, Input } from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as Yup from "yup";

import api from "@/services/api";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import CurrencyInputField from "@/shared/components/form/CurrencyInputField";
import SpinnerFullscreen from "./RenstraTableSpinnerFullscreen";

const YEARS = [1, 2, 3, 4, 5];
const ALL_YEARS = [1, 2, 3, 4, 5, 6];
const ENDPOINT = "/renstra-tabel-program";
const REDIRECT = "/renstra/tabel/program";

const getProgramRenstraId = (item) => item?.id ?? null;

const uniqueOptionsByValue = (options) => {
  const map = new Map();

  options.forEach((item) => {
    if (!item?.value) return;
    if (!map.has(String(item.value))) {
      map.set(String(item.value), item);
    }
  });

  return Array.from(map.values());
};

const makeLabel = (...parts) =>
  parts
    .map((item) =>
      item !== null && item !== undefined ? String(item).trim() : ""
    )
    .filter(Boolean)
    .join(" - ");

const RenstraTabelProgramForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const renstraId = renstraAktif?.id;

  const [paguInfoMessage, setPaguInfoMessage] = React.useState("");
  const [existingDataInfo, setExistingDataInfo] = React.useState(null);
  const [alasanRevisi, setAlasanRevisi] = React.useState("");
  const [submitRevisiLoading, setSubmitRevisiLoading] = React.useState(false);
  const [serverMessage, setServerMessage] = React.useState("");

  const { data: programOptions = [], isLoading: loadingProgram } = useQuery({
  queryKey: ["renstra-program", renstraId],
  queryFn: async () => {
      const res = await api.get("/renstra-program", {
        params: { renstra_id: renstraId },
      });

      return Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
    },
    enabled: !!renstraId,
  });

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
      alasan_revisi: initialData
        ? Yup.string().required("Alasan revisi wajib diisi")
        : Yup.string().nullable(),
      target_tahun_1: Yup.number().typeError("Harus angka").required(),
      target_tahun_2: Yup.number().typeError("Harus angka").required(),
      target_tahun_3: Yup.number().typeError("Harus angka").required(),
      target_tahun_4: Yup.number().typeError("Harus angka").required(),
      target_tahun_5: Yup.number().typeError("Harus angka").required(),
      target_tahun_6: Yup.number().nullable(),
      pagu_tahun_1: Yup.number().nullable(),
      pagu_tahun_2: Yup.number().nullable(),
      pagu_tahun_3: Yup.number().nullable(),
      pagu_tahun_4: Yup.number().nullable(),
      pagu_tahun_5: Yup.number().nullable(),
      pagu_tahun_6: Yup.number().nullable(),
    });

  const defaultValues = {
    program_id: initialData?.program_id
      ? String(initialData.program_id)
      : "",
    indikator_id: initialData?.indikator_id
      ? String(initialData.indikator_id)
      : "",
    baseline: initialData?.baseline ?? "",
    satuan_target: initialData?.satuan_target ?? "",
    lokasi: initialData?.lokasi ?? "",
    opd_penanggung_jawab:
    initialData?.opd_penanggung_jawab ??
    initialData?.program?.opd_penanggung_jawab ??
    renstraAktif?.nama_opd ??
    "",
        ...ALL_YEARS.reduce(
      (acc, i) => ({
        ...acc,
        [`target_tahun_${i}`]:
          i === 6 ? 0 : initialData?.[`target_tahun_${i}`] ?? "",
        [`pagu_tahun_${i}`]:
          i === 6 ? 0 : Number(initialData?.[`pagu_tahun_${i}`] || 0),
      }),
      {}
    ),

    target_akhir_renstra: initialData?.target_akhir_renstra ?? "",
    pagu_rpjmd_acuan: Number(initialData?.pagu_rpjmd_acuan || 0),
    pagu_akhir_renstra: Number(initialData?.pagu_akhir_renstra || 0),
    alasan_revisi: "",
  };

  const generatePayload = (data) => {
    const selectedProgram = programOptions.find(
    (p) => String(getProgramRenstraId(p)) === String(data.program_id)
  );

  const targetValues = YEARS.map(
      (i) => Number(data[`target_tahun_${i}`]) || 0
    );


  const selectedIndikator = indikatorOptions.find(
      (x) => String(x.id) === String(data.indikator_id)
    );


    return {
      renstra_id: Number(renstraId),
      program_id: selectedProgram ? Number(selectedProgram.id) : Number(data.program_id),
      indikator_id: Number(data.indikator_id),
      indikator: selectedIndikator?.nama_indikator || data.indikator || "",
      baseline: data.baseline,
      satuan_target: data.satuan_target,
      lokasi: data.lokasi,
      opd_penanggung_jawab: data.opd_penanggung_jawab,
      nama_program: selectedProgram?.nama_program || "",
      ...YEARS.reduce(
          (acc, i) => ({
            ...acc,
            [`target_tahun_${i}`]: Number(data[`target_tahun_${i}`]) || 0,
            [`pagu_tahun_${i}`]: Number(data[`pagu_tahun_${i}`]) || 0,
          }),
          {}
        ),

        ...(initialData ? { alasan_revisi: data.alasan_revisi } : {}),
    };
  };

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: ENDPOINT,
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-tabel-program"],
    redirectPath: REDIRECT,
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

  const selectedProgram = programOptions.find(
    (p) => String(getProgramRenstraId(p)) === String(selectedProgramId)
  );

  const selectedProgramRefId = selectedProgramId || null;

    const { data: paguCache = null, isLoading: loadingPaguCache } = useQuery({
    queryKey: ["renstra-pagu-cache", renstraId, "program", initialData?.id],
    queryFn: async () => {
      const res = await api.get("/renstra-pagu-cache", {
        params: {
          renstra_id: renstraId,
          stage: "program",
          ref_id: initialData.id,
        },
      });

      const rows = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      return rows[0] || null;
    },
    enabled: !!renstraId && !!initialData?.id,
  });

    const { data: indikatorOptions = [], isLoading: loadingIndikator } = useQuery({
    queryKey: [
    "indikator-renstra-program-form",
    renstraId,
    selectedProgramRefId,
    initialData?.id || "create",
  ],
  queryFn: async () => {
    const res = await api.get("/indikator-renstra", {
      params: {
        renstra_id: renstraId,
        stage: "program",
        ref_id: selectedProgramRefId,
      },
    });

      const raw = res.data;
      return Array.isArray(raw) ? raw : raw?.data ?? [];
    },
    enabled: !!renstraId && !!selectedProgramRefId,
  });

  const prevProgramIdRef = useRef(undefined);

useEffect(() => {
  const cur = selectedProgramId || undefined;
  const prev = prevProgramIdRef.current;

  if (prev !== undefined && prev !== cur && !initialData) {
    setValue("indikator_id", "");
    setValue("baseline", "");
    setValue("satuan_target", "");
    setValue("lokasi", "");
    setExistingDataInfo(null);
    setPaguInfoMessage("");

    YEARS.forEach((i) => {
      setValue(`target_tahun_${i}`, "");
      setValue(`pagu_tahun_${i}`, 0);
    });
    }

    prevProgramIdRef.current = cur;
  }, [selectedProgramId, setValue]);
  

  useEffect(() => {
    if (selectedProgram?.opd_penanggung_jawab) {
      setValue("opd_penanggung_jawab", selectedProgram.opd_penanggung_jawab);
      return;
    }

    if (initialData?.program?.opd_penanggung_jawab) {
      setValue("opd_penanggung_jawab", initialData.program.opd_penanggung_jawab);
    }
  }, [selectedProgram, initialData, setValue]);

  // 🔹 Auto set baseline, target, lokasi, pagu hanya untuk form baru
  useEffect(() => {
    if (!selectedIndikatorId) return;

    if (
        initialData &&
        String(selectedIndikatorId) === String(initialData.indikator_id)
      ) {
        return;
      }

    const selected = indikatorOptions.find(
      (i) => String(i.id) === String(selectedIndikatorId)
    );

    if (!selected) return;

    setValue("indikator", selected.nama_indikator ?? "");

    setValue(
      "baseline",
      selected.baseline ??
        selected.nilai_baseline ??
        selected.target_awal ??
        selected.kondisi_awal ??
        ""
    );

    setValue("satuan_target", selected.satuan ?? selected.satuan_target ?? "");

    setValue(
      "lokasi",
      [selected.lokasi, selected.lokasi_pelaksanaan, selected.sumber_data, selected.keterangan]
        .map((x) => (x != null ? String(x).trim() : ""))
        .find(Boolean) ?? ""
    );

    YEARS.forEach((i) => {
      let val =
        selected[`target_tahun_${i}`] ??
        selected[`target_${i}`] ??
        selected[`target_tahun${i}`] ??
        selected[`tahun_${i}`];

      if (i === 6 && !val) {
        val =
          selected.target_tahun_5 ??
          selected.target_akhir ??
          selected.target_akhir_renstra ??
          selected.kondisi_akhir;
      }

      setValue(`target_tahun_${i}`, val ?? "");
        });
        if (!initialData) {
      const paguAcuan = Number(
        selected.pagu_cached ||
          selected.total_pagu_rpjmd ||
          selected.pagu_rpjmd_acuan ||
          selected.pagu_akhir_renstra ||
          0
      );

      const paguDasar = Math.floor(paguAcuan / 5);
      const sisaPagu = paguAcuan - paguDasar * 5;

      setValue("pagu_rpjmd_acuan", paguAcuan);

      for (let i = 1; i <= 4; i++) {
        setValue(`pagu_tahun_${i}`, paguDasar);
      }

      setValue("pagu_tahun_5", paguDasar + sisaPagu);
      setValue("pagu_tahun_6", 0);
      setValue("pagu_akhir_renstra", paguAcuan);
    }
  }, [selectedIndikatorId, indikatorOptions, initialData, setValue]);

    // 🔴 PAGU EDIT: pakai initialData, tapi jangan timpa fallback indikator kalau data lama masih 0
    useEffect(() => {
      if (!initialData) return;

      const hasExistingPagu =
        YEARS.some((i) => Number(initialData?.[`pagu_tahun_${i}`] || 0) > 0) ||
        Number(initialData?.pagu_rpjmd_acuan || 0) > 0;

      if (!hasExistingPagu) return;

      const source = initialData;

    YEARS.forEach((i) => {
      setValue(`pagu_tahun_${i}`, Number(source[`pagu_tahun_${i}`] || 0), {
        shouldValidate: false,
        shouldDirty: false,
      });
    });

    setValue(
      "pagu_akhir_renstra",
      Number(source.pagu_akhir_renstra || 0),
      {
        shouldValidate: false,
        shouldDirty: false,
      }
    );

    setPaguInfoMessage(
      "Pagu RPJMD readonly. Pagu Renstra tahun 1–5 dapat direvisi."
    );

    setExistingDataInfo(null);
  }, [initialData, paguCache, setValue]);

  const targetValues = watch(YEARS.map((i) => `target_tahun_${i}`));

  const targetAkhirRenstra = useMemo(() => {
    const nums = targetValues.map((v) => Number(v) || 0);
    const total = nums.reduce((a, b) => a + b, 0);
    return nums.length > 0 ? (total / nums.length).toFixed(2) : 0;
  }, [targetValues]);

  const paguValues = watch(YEARS.map((i) => `pagu_tahun_${i}`));

  const paguAkhirRenstra = useMemo(() => {
    return paguValues.reduce(
      (total, value) => total + (Number(value) || 0),
      0
    );
  }, [paguValues]);

  useEffect(() => {
    setValue("pagu_akhir_renstra", paguAkhirRenstra, {
      shouldValidate: false,
      shouldDirty: false,
    });

    setValue("pagu_tahun_6", 0, {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [paguAkhirRenstra, setValue]);

    useEffect(() => {
    setValue("target_akhir_renstra", targetAkhirRenstra);
    }, [targetAkhirRenstra, setValue]);
  
    const programSelectOptions = useMemo(() => {
    const options = programOptions.map((item) => ({
      value: String(item.id),
      label:
        makeLabel(item.kode_program, item.nama_program) ||
        `Program ${item.id}`,
    }));

    if (initialData?.program_id) {
      const exists = options.some(
        (item) => String(item.value) === String(initialData.program_id)
      );

      if (!exists) {
        options.unshift({
          value: String(initialData.program_id),
          label:
            makeLabel(
              initialData?.kode_program || initialData?.program?.kode_program,
              initialData?.nama_program || initialData?.program?.nama_program
            ) || `Program ${initialData.program_id}`,
        });
      }
    }

    return uniqueOptionsByValue(options);
  }, [programOptions, initialData]);
  
    const indikatorSelectOptions = useMemo(() => {
      const options = indikatorOptions.map((item) => ({
        value: String(item.id),
        label: item.nama_indikator || item.kode_indikator || `Indikator ${item.id}`,
      }));

      if (initialData?.indikator_id) {
        const exists = options.some(
          (item) => String(item.value) === String(initialData.indikator_id)
        );

        if (!exists) {
          options.unshift({
            value: String(initialData.indikator_id),
            label:
              initialData?.indikator ||
              initialData?.indikator_detail?.nama_indikator ||
              `Indikator ${initialData.indikator_id}`,
          });
        }
      }

      return uniqueOptionsByValue(options);
    }, [indikatorOptions, initialData]);
  
    useEffect(() => {
      if (!initialData || !indikatorOptions.length) return;

      const selected = indikatorOptions.find(
        (item) =>
          String(item.id) === String(initialData.indikator_id) ||
          String(item.source_indikator_id) === String(initialData.indikator_id)
      );

      setValue(
        "indikator",
        selected?.nama_indikator ||
          initialData?.indikator_detail?.nama_indikator ||
          initialData?.indikator ||
          ""
      );

      setValue(
        "satuan_target",
        initialData?.satuan_target ||
          selected?.satuan ||
          initialData?.indikator_detail?.satuan ||
          ""
      );

      if (Number(initialData?.pagu_rpjmd_acuan || 0) <= 0 && selected) {
        const paguAcuan = Number(
          selected.pagu_cached ||
            selected.total_pagu_rpjmd ||
            selected.pagu_rpjmd_acuan ||
            0
        );

        const paguDasar = Math.floor(paguAcuan / 5);
        const sisaPagu = paguAcuan - paguDasar * 5;

        setValue("pagu_rpjmd_acuan", paguAcuan, {
          shouldValidate: false,
          shouldDirty: false,
        });

        for (let i = 1; i <= 4; i++) {
          setValue(`pagu_tahun_${i}`, paguDasar, {
            shouldValidate: false,
            shouldDirty: false,
          });
        }

        setValue("pagu_tahun_5", paguDasar + sisaPagu, {
          shouldValidate: false,
          shouldDirty: false,
        });

        setValue("pagu_tahun_6", 0, {
          shouldValidate: false,
          shouldDirty: false,
        });

        setValue("pagu_akhir_renstra", paguAcuan, {
          shouldValidate: false,
          shouldDirty: false,
        });
      }
    }, [initialData, indikatorOptions, setValue]);
  
    useEffect(() => {
      if (!initialData) return;

      setValue(
        "program_id",
        initialData?.program_id ? String(initialData.program_id) : ""
      );

      setValue(
        "indikator_id",
        initialData?.indikator_id ? String(initialData.indikator_id) : ""
      );

      setValue(
        "indikator",
        initialData?.indikator ??
          initialData?.indikator_detail?.nama_indikator ??
          ""
      );
      setValue("baseline", initialData?.baseline ?? "");
      setValue("satuan_target", initialData?.satuan_target ?? "");
      setValue("lokasi", initialData?.lokasi ?? "");
      setValue(
        "opd_penanggung_jawab",
        initialData?.opd_penanggung_jawab ??
          initialData?.program?.opd_penanggung_jawab ??
          renstraAktif?.nama_opd ??
          ""
      );

      YEARS.forEach((i) => {
        setValue(`target_tahun_${i}`, initialData?.[`target_tahun_${i}`] ?? "");
      });

      setValue("target_tahun_6", 0);
      setValue("pagu_tahun_6", 0);
      setValue("target_akhir_renstra", initialData?.target_akhir_renstra ?? "");

      const paguAcuan = Number(initialData?.pagu_rpjmd_acuan || 0);

      const hasPaguTahunan = YEARS.some(
        (i) => Number(initialData?.[`pagu_tahun_${i}`] || 0) > 0
      );

      if (hasPaguTahunan) {
        YEARS.forEach((i) => {
          setValue(`pagu_tahun_${i}`, Number(initialData?.[`pagu_tahun_${i}`] || 0), {
            shouldValidate: false,
            shouldDirty: false,
          });
        });

        setValue("pagu_rpjmd_acuan", paguAcuan, {
          shouldValidate: false,
          shouldDirty: false,
        });

        setValue("pagu_akhir_renstra", Number(initialData?.pagu_akhir_renstra || 0), {
          shouldValidate: false,
          shouldDirty: false,
        });
      } else if (paguAcuan > 0) {
        const paguDasar = Math.floor(paguAcuan / 5);
        const sisaPagu = paguAcuan - paguDasar * 5;

        for (let i = 1; i <= 4; i++) {
          setValue(`pagu_tahun_${i}`, paguDasar, {
            shouldValidate: false,
            shouldDirty: false,
          });
        }

        setValue("pagu_tahun_5", paguDasar + sisaPagu, {
          shouldValidate: false,
          shouldDirty: false,
        });

        setValue("pagu_tahun_6", 0, {
          shouldValidate: false,
          shouldDirty: false,
        });

        setValue("pagu_rpjmd_acuan", paguAcuan, {
          shouldValidate: false,
          shouldDirty: false,
        });

        setValue("pagu_akhir_renstra", paguAcuan, {
          shouldValidate: false,
          shouldDirty: false,
        });
      }
    }, [initialData, renstraAktif, setValue]);
  
    const handleSubmitRevisi = async (data) => {
      if (!initialData?.id) {
        return onSubmit(data);
      }

      if (!alasanRevisi.trim()) {
        setServerMessage("Alasan revisi wajib diisi.");
        return;
      }

      try {
        setSubmitRevisiLoading(true);
        setServerMessage("");

        const payload = {
          ...generatePayload(data),
          alasan_revisi: alasanRevisi,
        };

        const isApproved = initialData?.status_revisi === "approved";

        if (isApproved) {
          await api.post(`${ENDPOINT}/${initialData.id}/revisi`, payload);
        } else {
          await api.put(`${ENDPOINT}/${initialData.id}`, payload);
        }

        setServerMessage("✅ Revisi berhasil disimpan sebagai draft.");
      } catch (err) {
        setServerMessage(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Gagal menyimpan revisi."
        );
      } finally {
        setSubmitRevisiLoading(false);
      }
    };

    const shouldShowSpinner = !renstraAktif || loadingProgram || loadingPaguCache;

  return (
    <Card
      title={
        initialData
          ? initialData?.status_revisi === "approved"
            ? "Revisi Renstra Tabel Program"
            : "Edit Renstra Tabel Program"
          : "Tambah Renstra Tabel Program"
      }
    >
      {shouldShowSpinner ? (
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
              ⚠️ <strong>Belum ada Program Renstra.</strong> Tambahkan terlebih
              dahulu melalui <strong>Aksi Input Data Renstra → Program</strong>,
              lalu kembali ke halaman ini.
            </div>
          )}

          <form onSubmit={handleSubmit(initialData ? handleSubmitRevisi : onSubmit)}>
            <SelectWithLabelValue
              name="program_id"
              label="Program"
              control={control}
              errors={errors}
              required
              options={programSelectOptions}
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
              disabled={!selectedProgramRefId || loadingIndikator}
              options={indikatorSelectOptions}
              />
              
              <InputField
                name="indikator"
                label="Nama Indikator"
                control={control}
                errors={errors}
                disabled
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

            <h4 style={{ marginTop: 24 }}>
              Target periode (th. ke-1 s/d ke-5)
            </h4>
            {YEARS.map((i) => (
              <InputField
                key={`target_tahun_${i}`}
                name={`target_tahun_${i}`}
                label={`Target (th. ke-${i})`}
                control={control}
                errors={errors}
              />
            ))}

              <h4 style={{ marginTop: 24 }}>Pagu RPJMD Acuan</h4>

              <CurrencyInputField
                name="pagu_rpjmd_acuan"
                label="Pagu RPJMD Acuan"
                control={control}
                errors={errors}
                disabled
              />

              <h4 style={{ marginTop: 24 }}>Pagu Renstra periode (th. ke-1 s/d ke-5)</h4>
              
            {paguInfoMessage && (
              <Alert
                type={paguCache ? "success" : "warning"}
                showIcon
                style={{ marginBottom: 16 }}
                message="Informasi Pagu"
                description={paguInfoMessage}
              />
            )}

            {YEARS.map((i) => (
              <CurrencyInputField
                key={`pagu_tahun_${i}`}
                name={`pagu_tahun_${i}`}
                label={`Pagu (th. ke-${i})`}
                control={control}
                errors={errors}
                disabled={!initialData}
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
              
              {initialData && (
                <div style={{ marginTop: 24 }}>
                  <h4>Alasan Revisi</h4>
                  <Input.TextArea
                    rows={4}
                    value={alasanRevisi}
                    onChange={(e) => {
                      setAlasanRevisi(e.target.value);
                      setValue("alasan_revisi", e.target.value);
                    }}
                    placeholder="Tuliskan alasan revisi target/pagu Renstra..."
                  />
                </div>
              )}

              {serverMessage && (
                <Alert
                  style={{ marginTop: 16 }}
                  type={serverMessage.startsWith("✅") ? "success" : "warning"}
                  showIcon
                  message={serverMessage}
                />
              )}

            <div style={{ marginTop: 24 }}>
              {!existingDataInfo || initialData ? (
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={initialData ? submitRevisiLoading : isSubmitting}
                >
                  {initialData
                    ? initialData?.status_revisi === "approved"
                      ? "Buat Revisi"
                      : "Simpan Draft"
                    : "Simpan"}
                </Button>
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="Data sudah ada"
                  description="Gunakan Edit jika ingin mengubah."
                />
              )}
            </div>
          </form>
        </>
      )}
    </Card>
  );
};

export default RenstraTabelProgramForm;