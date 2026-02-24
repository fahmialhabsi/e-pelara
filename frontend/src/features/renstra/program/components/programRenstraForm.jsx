import React, { useEffect, useState } from "react";
import { Button, Card, Typography, App } from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import * as Yup from "yup";

import api from "@/services/api";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import SelectWithLabelValue from "@/shared/components/form/SelectWithLabelValue";
import InputField from "@/shared/components/form/InputField";

const { Text } = Typography;

const ProgramRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  // 🔄 Data program (pakai tahun & jenis_dokumen dari renstraAktif)
  const { data: programOptions = [], isLoading: isLoadingProgram } = useQuery({
    queryKey: [
      "program-rpjmd",
      renstraAktif?.tahun_awal,
      renstraAktif?.jenis_dokumen,
    ],
    queryFn: async () =>
      (
        await api.get("/programs/all", {
          params: {
            tahun: renstraAktif?.tahun_awal,
            jenis_dokumen: renstraAktif?.jenis_dokumen,
          },
        })
      ).data.data,
    enabled: !!renstraAktif,
  });

  const { data: opdOptions = [] } = useQuery({
    queryKey: ["opd-penanggung-jawab"],
    queryFn: async () => (await api.get("/opd-penanggung-jawab")).data.data,
  });

  // Yup schema
  const schema = () =>
    Yup.object({
      program_rpjmd_id: Yup.string().required("Program RPJMD wajib dipilih"),
      kode_program: Yup.string().required("Kode Program wajib diisi"),
      nama_program: Yup.string().required("Nama Program wajib diisi"),
      renstra_id: Yup.number()
        .typeError("Renstra ID harus berupa angka")
        .required("Renstra ID tidak boleh kosong")
        .positive("Renstra ID harus lebih dari 0"),
      opd_penanggung_jawab: Yup.string().required("OPD Penanggung Jawab wajib"),
      bidang_opd_penanggung_jawab: Yup.string().required("Bidang OPD wajib"),
    });

  const defaultValues = {
    program_rpjmd_id: initialData?.rpjmd_program_id
      ? String(initialData.rpjmd_program_id)
      : "",
    kode_program: initialData?.kode_program || "",
    nama_program: initialData?.nama_program || "",
    renstra_id:
      typeof renstraAktif?.id === "number" ? renstraAktif.id : undefined,
    opd_penanggung_jawab: initialData?.opd_penanggung_jawab || "",
    bidang_opd_penanggung_jawab: initialData?.bidang_opd_penanggung_jawab || "",
  };

  const generatePayload = (data) => ({
    rpjmd_program_id: data.program_rpjmd_id,
    kode_program: data.kode_program,
    nama_program: data.nama_program,
    renstra_id: data.renstra_id,
    opd_penanggung_jawab: data.opd_penanggung_jawab,
    bidang_opd_penanggung_jawab: data.bidang_opd_penanggung_jawab,
  });

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/renstra-program",
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-program"],
    redirectPath: "/renstra/program",
  });

  const {
    control,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;

  const programId = useWatch({ control, name: "program_rpjmd_id" });
  const opdTerpilih = useWatch({ control, name: "opd_penanggung_jawab" });

  useEffect(() => {
    if (!programId) return;

    const selected = programOptions.find(
      (p) => String(p.id) === String(programId)
    );
    if (!selected) return;

    setValue("kode_program", selected.kode_program);
    setValue("nama_program", selected.nama_program);
  }, [programId, programOptions, setValue]);

  // Filter bidang dari OPD yang dipilih
  const bidangOptions = opdOptions
    .filter((item) => item.nama_opd === opdTerpilih)
    .map((item) => ({
      label: item.nama_bidang_opd,
      value: item.nama_bidang_opd,
    }));

  return (
    <Card
      title={initialData ? "Edit Program Renstra" : "Tambah Program Renstra"}
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali
        </Button>
        <Button onClick={() => navigate("/renstra/program")}>
          📄 Daftar Program
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Program */}
        <SelectWithLabelValue
          name="program_rpjmd_id"
          label="Program RPJMD"
          control={control}
          errors={errors}
          required
          loading={isLoadingProgram}
          options={programOptions.map((item) => ({
            label: `${item.kode_program} - ${item.nama_program}`,
            value: String(item.id),
          }))}
          onChange={(val) => setValue("program_rpjmd_id", val)}
        />

        <InputField
          name="kode_program"
          label="Kode Program"
          control={control}
          errors={errors}
          disabled
        />

        <InputField
          name="nama_program"
          label="Nama Program"
          control={control}
          errors={errors}
          disabled
        />

        {/* OPD & Bidang */}
        <SelectWithLabelValue
          name="opd_penanggung_jawab"
          label="OPD Penanggung Jawab"
          control={control}
          errors={errors}
          required
          options={Array.from(
            new Set(opdOptions.map((opd) => opd.nama_opd))
          ).map((opdName) => ({ label: opdName, value: opdName }))}
          onChange={(val) => {
            setValue("opd_penanggung_jawab", val);
            setValue("bidang_opd_penanggung_jawab", ""); // reset bidang
          }}
        />

        <SelectWithLabelValue
          name="bidang_opd_penanggung_jawab"
          label="Bidang OPD Penanggung Jawab"
          control={control}
          errors={errors}
          required
          options={bidangOptions}
        />

        <div style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {initialData ? "Update" : "Simpan"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ProgramRenstraForm;
