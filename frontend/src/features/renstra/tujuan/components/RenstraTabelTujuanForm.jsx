// src/features/renstra/tujuan/components/RenstraTabelTujuanForm.jsx
import React, { useEffect, useMemo } from "react";
import { Card, Button, Alert, Input } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as Yup from "yup";

import api from "@/services/api";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import SpinnerFullscreen from "./SpinnerTujuanFullscreen";
import CurrencyInputField from "@/shared/components/form/CurrencyInputField";

const YEARS = [1, 2, 3, 4, 5];

const emptyPagu = {
  pagu_rpjmd_acuan: 0,
  pagu_tahun_1: 0,
  pagu_tahun_2: 0,
  pagu_tahun_3: 0,
  pagu_tahun_4: 0,
  pagu_tahun_5: 0,
  pagu_tahun_6: 0,
  pagu_akhir_renstra: 0,
};

const RenstraTabelTujuanForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { tujuanId } = useParams();
  const [paguInfoMessage, setPaguInfoMessage] = React.useState("");
  const [alasanRevisi, setAlasanRevisi] = React.useState("");
  const [submitRevisiLoading, setSubmitRevisiLoading] = React.useState(false);
  const [serverMessage, setServerMessage] = React.useState("");

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

    const { data: tabelTujuanByTujuan = [], isLoading: loadingTabelTujuan } =
      useQuery({
        queryKey: ["renstra-tabel-tujuan-by-tujuan", tujuanId],
        queryFn: async () => {
          const res = await api.get(
            `/renstra-tabel-tujuan/by-tujuan/${tujuanId}`
          );
          return res.data;
        },
        enabled: !!tujuanId,
      });

    const { data: historyRows = [], refetch: refetchHistory } = useQuery({
    queryKey: ["renstra-tabel-tujuan-history", initialData?.id],
    queryFn: async () => {
      const res = await api.get(`/renstra-tabel-tujuan/${initialData.id}/history`);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: !!initialData?.id,
  });

    const schema = () =>
    Yup.object({
      tujuan_id: Yup.string().required("Tujuan wajib dipilih"),
      indikator_id: Yup.string().required("Indikator wajib dipilih"),
      baseline: Yup.number().typeError("Baseline harus angka").required(),
      satuan_target: Yup.string().required("Satuan target wajib diisi"),
      lokasi: Yup.string().nullable(),
      target_tahun_1: Yup.number().typeError("Harus angka").required(),
      target_tahun_2: Yup.number().typeError("Harus angka").required(),
      target_tahun_3: Yup.number().typeError("Harus angka").required(),
      target_tahun_4: Yup.number().typeError("Harus angka").required(),
      target_tahun_5: Yup.number().typeError("Harus angka").required(),
      pagu_tahun_1: Yup.number().nullable(),
      pagu_tahun_2: Yup.number().nullable(),
      pagu_tahun_3: Yup.number().nullable(),
      pagu_tahun_4: Yup.number().nullable(),
      pagu_tahun_5: Yup.number().nullable(),
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
    target_tahun_6: 0,

    pagu_rpjmd_acuan: initialData?.pagu_rpjmd_acuan ?? 0,
    pagu_tahun_1: initialData?.pagu_tahun_1 ?? 0,
    pagu_tahun_2: initialData?.pagu_tahun_2 ?? 0,
    pagu_tahun_3: initialData?.pagu_tahun_3 ?? 0,
    pagu_tahun_4: initialData?.pagu_tahun_4 ?? 0,
    pagu_tahun_5: initialData?.pagu_tahun_5 ?? 0,
    pagu_tahun_6: 0,
    pagu_akhir_renstra: initialData?.pagu_akhir_renstra ?? 0,

    versi: initialData?.versi ?? 1,
    status_revisi: initialData?.status_revisi ?? "draft",
    target_akhir_renstra: initialData?.target_akhir_renstra ?? "",
  };

    const generatePayload = (data) => {
    const targetValues = YEARS.map((i) => Number(data[`target_tahun_${i}`]) || 0);
    const paguValues = YEARS.map((i) => Number(data[`pagu_tahun_${i}`]) || 0);

    return {
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
      target_tahun_6: 0,

      pagu_tahun_1: data.pagu_tahun_1,
      pagu_tahun_2: data.pagu_tahun_2,
      pagu_tahun_3: data.pagu_tahun_3,
      pagu_tahun_4: data.pagu_tahun_4,
      pagu_tahun_5: data.pagu_tahun_5,
      pagu_tahun_6: 0,

      target_akhir_renstra:
        targetValues.reduce((a, b) => a + b, 0) / targetValues.length || 0,

      pagu_akhir_renstra: paguValues.reduce((a, b) => a + b, 0),
    };
  };

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

  const selectedTujuanId = watch("tujuan_id");
  const selectedIndikatorId = watch("indikator_id");

  useEffect(() => {
  if (!initialData || !tujuanOptions.length) return;

  setValue("tujuan_id", String(initialData.tujuan_id));
  }, [initialData, tujuanOptions, setValue]);

  const { data: indikatorOptions = [], isLoading: loadingIndikator } = useQuery({
    queryKey: [
      "indikator-renstra",
      renstraAktif?.id,
      "tujuan",
      selectedTujuanId,
    ],
    queryFn: async () => {
      const res = await api.get("/indikator-renstra", {
        params: {
          renstra_id: renstraAktif?.id,
          stage: "tujuan",
          tujuan_id: selectedTujuanId,
        },
      });

      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: !!renstraAktif?.id && !!selectedTujuanId,
  });

  useEffect(() => {
    if (!selectedTujuanId) return;

    const selected = tujuanOptions.find(
      (t) => String(t.id) === String(selectedTujuanId)
    );

    if (selected) {
      setValue("kode_tujuan", selected.no_tujuan ?? "");
      setValue("nama_tujuan", selected.isi_tujuan ?? "");
    }
  }, [selectedTujuanId, tujuanOptions, setValue]);

  useEffect(() => {
    setValue("indikator_id", "");
    setPaguInfoMessage("");
  }, [selectedTujuanId, setValue]);

  useEffect(() => {
  if (!initialData || indikatorOptions.length === 0) return;
  if (!initialData.indikator_id) return;

  const selectedOption = indikatorOptions.find(
    (item) =>
      String(item.id) === String(initialData.indikator_id) ||
      String(item.source_indikator_id) === String(initialData.indikator_id)
  );

  if (!selectedOption) return;

  setValue("indikator_id", String(selectedOption.id), {
    shouldValidate: true,
    shouldDirty: false,
  });
}, [initialData, indikatorOptions, setValue]);

  useEffect(() => {
  if (!selectedIndikatorId) return;

  const selected = indikatorOptions.find(
    (i) => String(i.id) === String(selectedIndikatorId)
  );

  if (!selected) return;

  console.log("INDIKATOR TERPILIH:", selected);

  setValue("baseline", selected.baseline ?? "", {
    shouldValidate: true,
    shouldDirty: true,
  });

  setValue("satuan_target", selected.satuan ?? "", {
    shouldValidate: true,
    shouldDirty: true,
  });

  const lokasi =
    selected.lokasi?.trim?.() ||
    selected.renstra?.bidang_opd?.trim?.() ||
    initialData?.lokasi ||
    "";

  setValue("lokasi", lokasi, {
    shouldValidate: true,
    shouldDirty: true,
  });

  for (let i = 1; i <= 6; i++) {
    const key = `target_tahun_${i}`;
    let value = selected[key];

    if (i === 6) {
      value = 0;
    }

    setValue(key, value ?? "", {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  const paguAcuan = Number(
    selected.pagu_cached ||
      selected.total_pagu_rpjmd ||
      selected.pagu_rpjmd_acuan ||
      initialData?.pagu_rpjmd_acuan ||
      0
  );

  const paguDasar = Math.floor(paguAcuan / 5);
  const sisaPagu = paguAcuan - paguDasar * 5;

  setValue("pagu_rpjmd_acuan", paguAcuan, {
    shouldValidate: true,
    shouldDirty: true,
  });

  for (let i = 1; i <= 4; i++) {
    setValue(`pagu_tahun_${i}`, paguDasar, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  setValue("pagu_tahun_5", paguDasar + sisaPagu, {
    shouldValidate: true,
    shouldDirty: true,
  });

  setValue("pagu_tahun_6", 0, {
    shouldValidate: true,
    shouldDirty: true,
  });

  setValue("pagu_akhir_renstra", paguAcuan, {
    shouldValidate: true,
    shouldDirty: true,
  });

  setPaguInfoMessage(
    `Pagu RPJMD Rp ${paguAcuan.toLocaleString(
      "id-ID"
    )} dibagi ke tahun 1–5. Jika ada sisa, dimasukkan ke tahun ke-5.`
  );
}, [selectedIndikatorId, indikatorOptions, setValue, initialData]);

  const targetValues = watch([
    "target_tahun_1",
    "target_tahun_2",
    "target_tahun_3",
    "target_tahun_4",
    "target_tahun_5",
  ]);

  const targetAkhirRenstra = useMemo(() => {
    const nums = targetValues.map((v) => Number(v) || 0);
    const total = nums.reduce((a, b) => a + b, 0);
    return nums.length > 0 ? (total / nums.length).toFixed(2) : 0;
  }, [targetValues]);

    const paguValues = watch([
    "pagu_tahun_1",
    "pagu_tahun_2",
    "pagu_tahun_3",
    "pagu_tahun_4",
    "pagu_tahun_5",
  ]);

  const paguAkhirRenstra = useMemo(() => {
    return paguValues.reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [paguValues]);

  useEffect(() => {
    setValue("pagu_akhir_renstra", paguAkhirRenstra, {
      shouldDirty: false,
    });
  }, [paguAkhirRenstra, setValue]);

  useEffect(() => {
    setValue("target_akhir_renstra", targetAkhirRenstra, {
      shouldDirty: false,
    });
  }, [targetAkhirRenstra, setValue]);

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

      await api.put(`/renstra-tabel-tujuan/${initialData.id}/revisi`, payload);

      setServerMessage("✅ Revisi berhasil disimpan sebagai draft.");
      await refetchHistory();
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

  if (
    !renstraAktif ||
    loadingIndikator ||
    loadingTujuan ||
    loadingTabelTujuan
  ) {
    return <SpinnerFullscreen tip="Memuat data..." />;
  }

  return (
    <Card
      title={
        initialData
          ? "Edit Renstra Tabel Tujuan"
          : "Tambah Renstra Tabel Tujuan"
      }
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali
        </Button>
      </div>

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

      <form
        onSubmit={handleSubmit(initialData ? handleSubmitRevisi : onSubmit)}
      >
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

        <SelectWithLabelValue
          name="indikator_id"
          label="Indikator"
          control={control}
          errors={errors}
          required
          loading={loadingIndikator}
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

        <h4 style={{ marginTop: 24 }}>Target periode (th. ke-1 s/d ke-5)</h4>

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

            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Informasi Pagu"
              description={
                paguInfoMessage ||
                "Pagu RPJMD Acuan bersifat read-only. Pagu Renstra dapat direvisi dan seluruh perubahan tersimpan di history."
              }
            />

          {YEARS.map((i) => (
            <CurrencyInputField
              key={`pagu_tahun_${i}`}
              name={`pagu_tahun_${i}`}
              label={`Pagu Renstra (th. ke-${i})`}
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

        <CurrencyInputField
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
              onChange={(e) => setAlasanRevisi(e.target.value)}
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

        <Button
          type="primary"
          htmlType="submit"
          loading={initialData ? submitRevisiLoading : isSubmitting}
        >
          {initialData ? "Simpan Revisi" : "Simpan"}
        </Button>
        {initialData && historyRows.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3>Riwayat Revisi</h3>

            {historyRows.map((row) => (
              <Card
                key={row.id}
                size="small"
                style={{ marginBottom: 16 }}
                title={`Versi ${row.versi_sebelum} → ${row.versi_sesudah} | ${row.status_revisi}`}
              >
                <p>
                  <strong>Alasan:</strong> {row.alasan_revisi || "-"}
                </p>

                <p>
                  <strong>Pagu Sebelum:</strong>{" "}
                  {Number(row.before_json?.pagu_akhir_renstra || 0).toLocaleString(
                    "id-ID"
                  )}
                </p>

                <p>
                  <strong>Pagu Setelah:</strong>{" "}
                  {Number(row.after_json?.pagu_akhir_renstra || 0).toLocaleString(
                    "id-ID"
                  )}
                </p>

                <p>
                  <strong>Target Sebelum:</strong>{" "}
                  {row.before_json?.target_akhir_renstra ?? "-"}
                </p>

                <p>
                  <strong>Target Setelah:</strong>{" "}
                  {row.after_json?.target_akhir_renstra ?? "-"}
                </p>

                <p>
                  <strong>Dibuat:</strong> {row.dibuat_pada || "-"}
                </p>

                <p>
                  <strong>Diverifikasi:</strong> {row.diverifikasi_pada || "-"}
                </p>

                <p>
                  <strong>Disetujui:</strong> {row.disetujui_pada || "-"}
                </p>
              </Card>
            ))}
          </div>
        )}
      </form>
      
    </Card>
    
  );
    
};

export default RenstraTabelTujuanForm;