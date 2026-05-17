import React, { useEffect, useMemo, useRef } from "react";
import { Form, Button, Card, Typography, App, Alert } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import api from "@/services/api";

import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import TextAreaField from "@/shared/components/form/TextAreaField";
import InputField from "@/shared/components/form/InputField";

const { Text } = Typography;

const YEARS = [1, 2, 3, 4, 5, 6];
const ENDPOINT = "/indikator-kegiatan-renstra";
const REDIRECT = "/renstra/indikator-kegiatan";

const getKegiatanRefId = (item) => item?.ref_id ?? null;

const IndikatorKegiatanRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const renstraId = renstraAktif?.id;

  const [previewKegiatan, setPreviewKegiatan] = React.useState("");
  const [paguInfoMessage, setPaguInfoMessage] = React.useState("");
  const [existingDataInfo, setExistingDataInfo] = React.useState(null);


  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
  initialData,
  renstraAktif,
  endpoint: ENDPOINT,
  redirectPath: REDIRECT,
  queryKeys: ["indikator-kegiatan-renstra"],

  defaultValues: {
    kegiatan_renstra_id: initialData?.kegiatan?.ref_id
      ? String(initialData.kegiatan.ref_id)
      : initialData?.kegiatan?.rpjmd_kegiatan_id
      ? String(initialData.kegiatan.rpjmd_kegiatan_id)
      : initialData?.kegiatan_renstra_id
      ? String(initialData.kegiatan_renstra_id)
      : "",

    indikator_id: initialData?.indikator_id
      ? String(initialData.indikator_id)
      : "",

    kode_indikator: initialData?.kode_indikator ?? "",
    nama_indikator: initialData?.nama_indikator ?? "",
    baseline: initialData?.baseline ?? "",
    satuan: initialData?.satuan ?? "",
    lokasi: initialData?.lokasi ?? renstraAktif?.bidang_opd ?? "",
    opd_penanggung_jawab:
      initialData?.opd_penanggung_jawab ?? renstraAktif?.nama_opd ?? "",

    ...YEARS.reduce((acc, i) => ({
      ...acc,
      [`target_tahun_${i}`]: initialData?.[`target_tahun_${i}`] ?? "",
      [`pagu_tahun_${i}`]: initialData?.[`pagu_tahun_${i}`] ?? 0,
    }), {}),

    target_akhir_renstra: initialData?.target_akhir_renstra ?? "",
    pagu_akhir_renstra: initialData?.pagu_akhir_renstra ?? 0,
  },

  schema: {
    kegiatan_renstra_id: (yup) =>
      yup.string().required("Kegiatan Renstra wajib dipilih"),
    indikator_id: (yup) =>
      yup.string().required("Indikator wajib dipilih"),
    nama_indikator: (yup) =>
      yup.string().required("Nama indikator wajib diisi"),
    satuan: (yup) => yup.string().required("Satuan wajib diisi"),
    lokasi: (yup) => yup.string().required("Lokasi wajib diisi"),
    opd_penanggung_jawab: (yup) =>
      yup.string().required("OPD wajib diisi"),

    ...YEARS.reduce((acc, i) => ({
      ...acc,
      [`target_tahun_${i}`]: (yup) =>
        yup.number().typeError("Harus angka").required(),
      [`pagu_tahun_${i}`]: (yup) =>
        yup.number().typeError("Harus angka").required(),
    }), {}),
  },

  generatePayload: (formData) => {
    const selectedKegiatan = kegiatanOptions.find(
      (x) => String(getKegiatanRefId(x)) === String(formData.kegiatan_renstra_id)
    );

    const selectedIndikator = indikatorOptions.find(
      (x) => String(x.id) === String(formData.indikator_id)
    );

    const targetValues = YEARS.map(
      (i) => Number(formData[`target_tahun_${i}`]) || 0
    );

    const paguValues = YEARS.map(
      (i) => Number(formData[`pagu_tahun_${i}`]) || 0
    );

    return {
      kegiatan_renstra_id: selectedKegiatan ? Number(selectedKegiatan.id) : null,
      indikator_id: Number(formData.indikator_id),

      kode_indikator: formData.kode_indikator,
      nama_indikator:
        selectedIndikator?.nama_indikator || formData.nama_indikator || "",

      baseline: formData.baseline,
      satuan: formData.satuan,
      lokasi: formData.lokasi,
      opd_penanggung_jawab: formData.opd_penanggung_jawab,

      ...YEARS.reduce((acc, i) => ({
        ...acc,
        [`target_tahun_${i}`]: Number(formData[`target_tahun_${i}`]) || 0,
        [`pagu_tahun_${i}`]: Number(formData[`pagu_tahun_${i}`]) || 0,
      }), {}),

          target_akhir_renstra:
            targetValues.reduce((a, b) => a + b, 0) / targetValues.length || 0,
          pagu_akhir_renstra: paguValues.reduce((a, b) => a + b, 0),
        };
      },
    });

  const { data: kegiatanOptions = [], isLoading: loadingKegiatan } = useQuery({
  queryKey: ["kegiatan-renstra", renstraId],
  queryFn: async () => {
    const res = await api.get("/kegiatan-renstra", {
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

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const selectedKegiatanId = watch("kegiatan_renstra_id");
  const selectedIndikatorId = watch("indikator_id");

  const selectedKegiatan = kegiatanOptions.find(
    (x) => String(getKegiatanRefId(x)) === String(selectedKegiatanId)
  );

  const selectedKegiatanRefId = selectedKegiatan
  ? getKegiatanRefId(selectedKegiatan)
  : null;

  const { data: indikatorOptions = [], isLoading: loadingIndikator } = useQuery({
  queryKey: ["indikator-renstra", renstraId, "kegiatan", selectedKegiatanRefId],
  queryFn: async () => {
    const res = await api.get("/indikator-renstra", {
      params: {
        renstra_id: renstraId,
        stage: "kegiatan",
        ref_id: selectedKegiatanRefId,
      },
    });

    const raw = Array.isArray(res.data)
      ? res.data
      : res.data?.data ?? [];

    return raw.filter((item) => {
      const itemStage = String(item.stage ?? "").toLowerCase();
      const itemRenstraId = String(item.renstra_id ?? "");
      const itemRefId = String(item.ref_id ?? "");

      return (
        itemStage === "kegiatan" &&
        itemRenstraId === String(renstraId) &&
        itemRefId === String(selectedKegiatanRefId)
      );
    });
  },
  enabled: !!renstraId && !!selectedKegiatanRefId,
});

  const prevKegiatanIdRef = useRef(undefined);

useEffect(() => {
  const cur = selectedKegiatanId || undefined;
  const prev = prevKegiatanIdRef.current;

  if (prev !== undefined && prev !== cur) {
    setValue("indikator_id", "");
    setValue("kode_indikator", "");
    setValue("nama_indikator", "");
    setValue("baseline", "");
    setValue("satuan", "");
    setValue("lokasi", "");
    setExistingDataInfo(null);
    setPaguInfoMessage("");

    YEARS.forEach((i) => {
      setValue(`target_tahun_${i}`, "");
      setValue(`pagu_tahun_${i}`, 0);
    });
    }

    prevKegiatanIdRef.current = cur;
  }, [selectedKegiatanId, setValue]);
  
  useEffect(() => {
  if (!selectedKegiatan) return;

  setPreviewKegiatan(selectedKegiatan.nama_kegiatan || "");

  setValue(
    "opd_penanggung_jawab",
    selectedKegiatan.opd_penanggung_jawab ??
      renstraAktif?.nama_opd ??
      ""
    );
  }, [selectedKegiatan, renstraAktif, setValue]);

  useEffect(() => {
  if (!selectedIndikatorId) return;

  const selected = indikatorOptions.find(
    (i) => String(i.id) === String(selectedIndikatorId)
  );

  if (!selected) return;

  setValue("kode_indikator", selected.kode_indikator ?? "");
  setValue("nama_indikator", selected.nama_indikator ?? "");

  setValue(
    "baseline",
    selected.baseline ??
      selected.nilai_baseline ??
      selected.target_awal ??
      selected.kondisi_awal ??
      ""
  );

  setValue("satuan", selected.satuan ?? selected.satuan_target ?? "");

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
  }, [selectedIndikatorId, indikatorOptions, setValue]);

  useEffect(() => {
  if (
    initialData ||
    !selectedKegiatanRefId ||
    !selectedIndikatorId ||
    !renstraId
  ) {
    setPaguInfoMessage("");
    setExistingDataInfo(null);
    return;
  }

  const selected = indikatorOptions.find(
    (i) => String(i.id) === String(selectedIndikatorId)
  );

  if (!selected) return;

  let cancelled = false;

  (async () => {
    try {
      const res = await api.get("/indikator-kegiatan-renstra", {
        params: {
          kegiatan_renstra_id: selectedKegiatan?.id,
          indikator_id: selectedIndikatorId,
          opd_id: renstraId,
        },
      });

      const rows = Array.isArray(res.data)
        ? res.data
        : res.data?.data ?? [];

      if (cancelled) return;

      if (rows.length) {
        const latest = rows[0];
        setExistingDataInfo(latest);

        setValue("kode_indikator", latest.kode_indikator ?? "");
        setValue("nama_indikator", latest.nama_indikator ?? "");
        setValue("baseline", latest.baseline ?? "");
        setValue("satuan", latest.satuan ?? "");
        setValue("lokasi", latest.lokasi ?? "");
        setValue("opd_penanggung_jawab", latest.opd_penanggung_jawab ?? "");

        YEARS.forEach((i) => {
          setValue(`target_tahun_${i}`, latest[`target_tahun_${i}`] ?? "");
          setValue(`pagu_tahun_${i}`, Number(latest[`pagu_tahun_${i}`] || 0));
        });

        setPaguInfoMessage("Data sudah ada. Tombol Simpan disembunyikan.");
        return;
      }

      setExistingDataInfo(null);

      const hasPagu = YEARS.some((i) => {
        const v =
          selected[`pagu_tahun_${i}`] ??
          selected[`pagu_${i}`] ??
          selected[`pagu_tahun${i}`];

        return v != null && v !== "" && Number(v) > 0;
      });

      if (hasPagu) {
        YEARS.forEach((i) => {
          const v =
            selected[`pagu_tahun_${i}`] ??
            selected[`pagu_${i}`] ??
            selected[`pagu_tahun${i}`] ??
            0;

          setValue(`pagu_tahun_${i}`, Number(v || 0));
        });

        setPaguInfoMessage("Pagu otomatis diisi dari indikator Renstra.");
        return;
      }

      const totalPagu =
        selected.total_pagu_rpjmd ??
        selected.pagu_total ??
        selected.pagu_akhir ??
        selected.pagu_akhir_renstra;

      if (totalPagu) {
        const total = Number(totalPagu) || 0;
        const base = Math.floor(total / 6);
        const sisa = total - base * 6;

        YEARS.forEach((i) => {
          setValue(`pagu_tahun_${i}`, i === 6 ? base + sisa : base);
        });

        setPaguInfoMessage(
          "Pagu otomatis dibagi dari total pagu indikator Renstra."
        );
        return;
      }

      YEARS.forEach((i) => setValue(`pagu_tahun_${i}`, 0));
      setPaguInfoMessage("Belum ada data sebelumnya. Silakan isi pagu.");
    } catch (e) {
      setExistingDataInfo(null);
      setPaguInfoMessage("Gagal ambil riwayat pagu.");
    }
  })();

  return () => {
    cancelled = true;
  };
  }, [
    selectedKegiatanRefId,
    selectedKegiatan,
    selectedIndikatorId,
    indikatorOptions,
    renstraId,
    setValue,
    initialData,
  ]);

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
          ? "Edit Indikator Kegiatan Renstra"
          : "Tambah Indikator Kegiatan Renstra"
      }
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali ke Dashboard
        </Button>
        <Button onClick={() => navigate("/renstra/indikator-kegiatan")}>
          📄 Daftar Indikator Kegiatan
        </Button>
      </div>

      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        style={{ maxWidth: 700 }}
      >
        <SelectWithLabelValue
          name="kegiatan_renstra_id"
          label="Kegiatan Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Kegiatan Renstra"
          options={kegiatanOptions
            .filter((item) => getKegiatanRefId(item))
            .map((item) => ({
              value: String(getKegiatanRefId(item)),
              label: `${item.kode_kegiatan || ""} - ${item.nama_kegiatan}`,
            }))}
        />

        {previewKegiatan && (
          <Text
            type="secondary"
            style={{ marginTop: -8, display: "block", marginBottom: 12 }}
          >
            {previewKegiatan}
          </Text>
        )}

        <SelectWithLabelValue
          name="indikator_id"
          label="Indikator"
          control={control}
          errors={errors}
          required
          disabled={!selectedKegiatanRefId || loadingIndikator}
          options={indikatorOptions.map((item) => ({
            label: item.nama_indikator,
            value: String(item.id),
          }))}
        />

        <Form.Item label="Kode Indikator">
          <div style={{ background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
            {watch("kode_indikator") || "-"}
          </div>
        </Form.Item>

        <TextAreaField
          name="nama_indikator"
          label="Nama Indikator"
          control={control}
          errors={errors}
          required
          rows={3}
          disabled
        />

        <InputField
          name="baseline"
          label="Baseline"
          control={control}
          errors={errors}
        />

      <InputField
        name="satuan"
        label="Satuan"
        control={control}
        errors={errors}
        required
      />

      <InputField
        name="lokasi"
        label="Lokasi"
        control={control}
        errors={errors}
        required
      />

      <InputField
        name="opd_penanggung_jawab"
        label="OPD Penanggung Jawab"
        control={control}
        errors={errors}
        disabled
      />

      <h4 style={{ marginTop: 24 }}>Target periode (th. ke-1 s/d ke-6)</h4>

      {YEARS.map((i) => (
        <InputField
          key={`target_tahun_${i}`}
          name={`target_tahun_${i}`}
          label={`Target (th. ke-${i})`}
          control={control}
          errors={errors}
        />
      ))}

      <h4 style={{ marginTop: 24 }}>Pagu periode (th. ke-1 s/d ke-6)</h4>

      {paguInfoMessage && (
        <Alert
          type={paguInfoMessage.includes("Belum") ? "warning" : "success"}
          showIcon
          style={{ marginBottom: 16 }}
          message="Informasi Pagu"
          description={paguInfoMessage}
        />
      )}

      {YEARS.map((i) => (
        <InputField
          key={`pagu_tahun_${i}`}
          name={`pagu_tahun_${i}`}
          label={`Pagu (th. ke-${i})`}
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

        <Form.Item>
          {!existingDataInfo || initialData ? (
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {initialData ? "Update" : "Simpan"}
            </Button>
          ) : (
          <Alert
            type="warning"
            showIcon
            message="Data sudah ada"
            description="Gunakan Edit jika ingin mengubah."
          />
        )}
      </Form.Item>
      </Form>
    </Card>
  );
};

export default IndikatorKegiatanRenstraForm;
