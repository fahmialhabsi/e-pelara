// src/features/renstra/kebijakan/components/kebijakanRenstraForm.jsx
import React, { useCallback, useEffect, useMemo } from "react";
import { Form, Button, Card, Space, App } from "antd";
import { useNavigate } from "react-router-dom";
import { useKebijakanRenstraForm } from "@/hooks/templatesUseRenstra/useKebijakanRenstraForm";
import { BsArrowLeftCircle, BsListCheck } from "react-icons/bs";

import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";
import TextAreaField from "@/shared/components/form/TextAreaField";

const KebijakanRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const {
    form,
    onSubmit,
    isSubmitting,
    isLoading,
    dropdowns,
    triggerKodeOtomatis,
  } = useKebijakanRenstraForm(initialData, renstraAktif);

  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  // ✅ Pastikan dropdowns selalu array
  const strategiOptions = Array.isArray(dropdowns?.["renstra-strategi"])
    ? dropdowns["renstra-strategi"]
    : [];
  const arahKebijakanOptionsRaw = Array.isArray(dropdowns?.["arah-kebijakan"])
    ? dropdowns["arah-kebijakan"]
    : [];

  const selectedRenstraStrategi = useMemo(() => {
    const sid = Number(watch("strategi_id"));
    if (!Number.isFinite(sid) || sid <= 0) return null;
    return strategiOptions.find((x) => Number(x?.id) === sid) ?? null;
  }, [strategiOptions, watch]);

  const expectedRpjmdStrategiId = useMemo(() => {
    const rid = Number(selectedRenstraStrategi?.rpjmd_strategi_id);
    return Number.isFinite(rid) && rid > 0 ? rid : null;
  }, [selectedRenstraStrategi?.rpjmd_strategi_id]);

  const expectedArahKodePrefix = useMemo(() => {
    const kode = String(selectedRenstraStrategi?.kode_strategi || "").trim();
    if (!kode) return "";
    // SSTx-... -> ASSTx-...
    return kode.replace(/^SST/i, "ASST");
  }, [selectedRenstraStrategi?.kode_strategi]);

  // Filter Arah Kebijakan RPJMD: hanya yang turunan dari Strategi RPJMD pada RenstraStrategi terpilih.
  const arahKebijakanOptions = useMemo(() => {
    let list = arahKebijakanOptionsRaw;

    if (expectedRpjmdStrategiId) {
      list = list.filter((x) => Number(x?.strategi_id) === Number(expectedRpjmdStrategiId));
    }

    // Tambahan filter kode: hanya ASST{kode_strategi}.* agar user tidak salah pilih.
    // Contoh: Strategi Renstra SST2-01-03.1 -> Arah RPJMD harus ASST2-01-03.1.1 / .2 dst.
    const pref = expectedArahKodePrefix;
    if (pref) {
      const filtered = list.filter((x) => String(x?.kode_arah || "").startsWith(`${pref}.`));
      // Jika sudah ada filter chain (strategi_id), jangan sampai dropdown kosong total hanya karena kode tidak selaras.
      if (expectedRpjmdStrategiId) return filtered.length ? filtered : list;
      return filtered;
    }

    return list;
  }, [arahKebijakanOptionsRaw, expectedRpjmdStrategiId, expectedArahKodePrefix]);

  const handleArahKebijakanChange = useCallback(
    (value) => {
      const selected = arahKebijakanOptionsRaw.find(
        (item) => Number(item.id) === Number(value)
      );
      const teks = selected?.deskripsi || "";
      setValue("no_arah_rpjmd", selected?.kode_arah || "");
      setValue("isi_arah_rpjmd", teks);
      setValue("deskripsi", teks);
      setValue("jenisDokumen", selected?.jenisDokumen || "");
      setValue("tahun", selected?.tahun || "");
    },
    [arahKebijakanOptions, setValue]
  );

  useEffect(() => {
    if (!initialData && renstraAktif?.id) {
      setValue("kode_kebjkn", "");
    } else if (initialData) {
      setValue("kode_kebjkn", initialData.kode_kebjkn);
      setValue("strategi_id", initialData.strategi_id);
      setValue("rpjmd_arah_id", initialData.rpjmd_arah_id);
      setValue("deskripsi", initialData.deskripsi);
      setValue("prioritas", initialData.prioritas);
      setValue("no_arah_rpjmd", initialData.no_arah_rpjmd);
      setValue("isi_arah_rpjmd", initialData.isi_arah_rpjmd);
      setValue("jenisDokumen", initialData.jenisDokumen);
      setValue("tahun", initialData.tahun);
      setValue("renstra_id", initialData.renstra_id);
    }
  }, [initialData, renstraAktif?.id, setValue]);

  // Jika data lama punya rpjmd_arah_id yang sudah tidak ada (mis. perubahan ID setelah clone/import),
  // coba auto-fix berdasarkan kode_arah (no_arah_rpjmd). Jika tidak bisa, kosongkan agar user memilih ulang.
  useEffect(() => {
    if (!initialData) return;
    if (!arahKebijakanOptions.length) return;

    const current = watch("rpjmd_arah_id");
    if (!current) return;

    const exists = arahKebijakanOptions.some((x) => Number(x.id) === Number(current));
    if (exists) return;

    const kode = String(initialData.no_arah_rpjmd || "").trim();
    const byKode = kode
      ? arahKebijakanOptions.find((x) => String(x.kode_arah || "").trim() === kode)
      : null;

    if (byKode?.id) {
      setValue("rpjmd_arah_id", byKode.id);
      handleArahKebijakanChange(byKode.id);
      message.warning(
        "Arah Kebijakan RPJMD pada data lama tidak ditemukan. Sistem menyesuaikan otomatis berdasarkan kode Arah Kebijakan.",
      );
      return;
    }

    // tidak bisa auto-fix → force pilih ulang
    setValue("rpjmd_arah_id", "");
    message.error("Arah Kebijakan RPJMD pada data ini tidak valid. Silakan pilih ulang Arah Kebijakan RPJMD.");
  }, [
    initialData,
    arahKebijakanOptions,
    setValue,
    watch,
    handleArahKebijakanChange,
    message,
  ]);

  useEffect(() => {
    const strategiId = watch("strategi_id");
    if (
      !initialData &&
      strategiId &&
      strategiOptions.length > 0 &&
      triggerKodeOtomatis
    ) {
      triggerKodeOtomatis(strategiId);
    }
  }, [
    watch("strategi_id"),
    strategiOptions,
    triggerKodeOtomatis,
    initialData,
    setValue,
  ]);

  // Jika strategi berubah dan arah kebijakan yang terpilih tidak termasuk chain-nya, kosongkan agar user pilih ulang.
  
  useEffect(() => {
    const currentArah = watch("rpjmd_arah_id");
    if (!currentArah) return;
    if (!expectedRpjmdStrategiId) return;

    const ok = arahKebijakanOptionsRaw.some(
      (x) =>
        Number(x?.id) === Number(currentArah) &&
        Number(x?.strategi_id) === Number(expectedRpjmdStrategiId),
    );
    if (ok) return;

    

    setValue("rpjmd_arah_id", "");
    setValue("no_arah_rpjmd", "");
    setValue("isi_arah_rpjmd", "");
    setValue("kode_kebjkn", "");
  }, [watch, expectedRpjmdStrategiId, arahKebijakanOptionsRaw, setValue]);

  

  // Jika strategi berubah dan arah kebijakan tidak sesuai prefix kode (ASST...), kosongkan agar user tidak salah pilih.
  useEffect(() => {
    const currentArah = watch("rpjmd_arah_id");
    if (!currentArah) return;
    const pref = expectedArahKodePrefix;
    if (!pref) return;

    const ok = arahKebijakanOptionsRaw.some(
      (x) =>
        Number(x?.id) === Number(currentArah) &&
        String(x?.kode_arah || "").startsWith(`${pref}.`),
    );
    if (ok) return;

    setValue("rpjmd_arah_id", "");
    setValue("no_arah_rpjmd", "");
    setValue("isi_arah_rpjmd", "");
    setValue("kode_kebjkn", "");
  }, [watch, expectedArahKodePrefix, arahKebijakanOptionsRaw, setValue]);

  

  return (
    <Card
      title={
        initialData ? "Edit Kebijakan Renstra" : "Tambah Kebijakan Renstra"
      }
      loading={isLoading}
    >
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<BsArrowLeftCircle />}
            onClick={() => navigate("/dashboard-renstra")}
          >
            Kembali
          </Button>
          <Button
            icon={<BsListCheck />}
            onClick={() => navigate("/renstra/kebijakan")}
          >
            Lihat Daftar
          </Button>
        </Space>
      </div>

      <Form
        layout="vertical"
        onFinish={form.handleSubmit(onSubmit)}
        style={{ maxWidth: 700 }}
      >
        <SelectWithLabelValue
          name="strategi_id"
          label="Strategi Renstra"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          options={strategiOptions.map((item) => ({
            value: item.id,
            label: `${item.kode_strategi} - ${item.deskripsi}`,
          }))}
          onChange={(val) => {
            setValue("strategi_id", val);
            setValue("rpjmd_arah_id", "");
            setValue("no_arah_rpjmd", "");
            setValue("isi_arah_rpjmd", "");
            setValue("kode_kebjkn", "");
            if (!initialData && triggerKodeOtomatis) triggerKodeOtomatis(val);
          }}
        />

        <SelectWithLabelValue
          name="rpjmd_arah_id"
          label="Arah Kebijakan RPJMD"
          control={control}
          errors={errors}
          required
          loading={isLoading}
          options={arahKebijakanOptions.map((item) => ({
            value: item.id,
            label: `${item.kode_arah} - ${item.deskripsi}`,
          }))}
          onChange={handleArahKebijakanChange}
        />

        <InputField
          name="kode_kebjkn"
          label="Nomor Kebijakan (Kode)"
          control={control}
          errors={errors}
          disabled
        />

        <TextAreaField
          name="deskripsi"
          label="Isi Kebijakan Renstra"
          control={control}
          errors={errors}
          required
        />

        <SelectWithLabelValue
          name="prioritas"
          label="Prioritas"
          control={control}
          errors={errors}
          required
          options={[
            { value: "Tinggi", label: "Tinggi" },
            { value: "Sedang", label: "Sedang" },
            { value: "Rendah", label: "Rendah" },
          ]}
        />

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {initialData ? "Update Kebijakan" : "Simpan Kebijakan"}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default KebijakanRenstraForm;
