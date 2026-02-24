// hooks/templatesUseRenstra/useKegiatanRenstraForm.js
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import api from "@/services/api";

const schema = yup.object({
  program_renstra_id: yup.number().required("Program Renstra wajib dipilih"),
  kode_kegiatan: yup.string().required("Kode kegiatan wajib diisi"),
  nama_kegiatan: yup.string().required("Nama kegiatan wajib diisi"),
  renstra_id: yup.number().nullable(),
  bidang_opd: yup.string(),
});

export function useKegiatanRenstraForm(initialData = {}, renstraAktif = {}) {
  const [programOptions, setProgramOptions] = useState([]);
  const [kegiatanOptions, setKegiatanOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      program_renstra_id: 0,
      rpjmd_kegiatan_id: 0,
      kode_kegiatan: "",
      nama_kegiatan: "",
      renstra_id: renstraAktif?.id || 0,
      bidang_opd: "",
      ...initialData,
    },
    resolver: yupResolver(schema),
  });

  const { watch, setValue } = form;
  const selectedProgramId = watch("program_renstra_id");

  const loadKegiatanByProgram = async (programId) => {
    if (!programId) {
      setKegiatanOptions([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.get(`/renstra-kegiatan/by-program/${programId}`);
      const options = (res.data || []).map((k) => ({
        value: k.kegiatan_rpjmd_id, // ← numeric ID
        label: `${k.kode_kegiatan} - ${k.nama_kegiatan}`,
        kode_kegiatan: k.kode_kegiatan,
        nama_kegiatan: k.nama_kegiatan,
        rpjmd_program_id: k.rpjmd_program_id,
      }));
      setKegiatanOptions(options);

      // pilih default
      let selected;
      if (
        initialData?.rpjmd_kegiatan_id &&
        programId === initialData?.program_renstra_id
      ) {
        selected = options.find(
          (k) => k.value === initialData?.rpjmd_kegiatan_id
        );
      }
      if (!selected && options.length > 0) selected = options[0];

      if (selected) {
        setValue("kode_kegiatan", selected.kode_kegiatan);
        setValue("nama_kegiatan", selected.nama_kegiatan);
      }
    } catch (err) {
      console.error("Gagal load kegiatan:", err);
      setKegiatanOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const initForm = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/renstra-program");
      const programs = res.data || [];
      setProgramOptions(programs);

      let defaultProgram =
        programs.find((p) => p.id === initialData?.program_renstra_id) ||
        programs[0];

      if (defaultProgram) {
        setValue("program_renstra_id", defaultProgram.id);
        setValue(
          "renstra_id",
          defaultProgram.renstra_id || renstraAktif?.id || 0
        );
        setValue(
          "bidang_opd",
          `${defaultProgram.bidang_opd_penanggung_jawab || ""} - ${
            defaultProgram.opd_penanggung_jawab || ""
          }`
        );

        await loadKegiatanByProgram(defaultProgram.id);
      }
    } catch (err) {
      console.error("Gagal inisialisasi form:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedProgramId) return;

    const fetchKegiatan = async () => {
      const selectedProgram = programOptions.find(
        (p) => p.id === selectedProgramId
      );
      if (selectedProgram) {
        setValue(
          "bidang_opd",
          `${selectedProgram.bidang_opd_penanggung_jawab || ""} - ${
            selectedProgram.opd_penanggung_jawab || ""
          }`
        );
        await loadKegiatanByProgram(selectedProgram.rpjmd_program_id);
      }
    };

    fetchKegiatan();
  }, [selectedProgramId, programOptions]);

  const onSubmit = async (data, message) => {
    setIsSubmitting(true);
    try {
      await api.post("/renstra-kegiatan", {
        program_id: data.program_renstra_id,
        kode_kegiatan: data.kode_kegiatan,
        nama_kegiatan: data.nama_kegiatan,
        renstra_id: data.renstra_id,
        bidang_opd: data.bidang_opd,
      });
      message?.success("Data berhasil disimpan");
    } catch (err) {
      console.error("Gagal submit:", err);
      const msg =
        err.response?.data?.error || "Gagal menyimpan data, silakan coba lagi";
      message?.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    initForm();
  }, []);

  return {
    form,
    programOptions,
    kegiatanOptions,
    isLoading,
    isSubmitting,
    onSubmit,
  };
}
