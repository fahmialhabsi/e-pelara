// src/hooks/templatesUseRenstra/useKebijakanRenstraForm.js
import { useCallback, useEffect, useState } from "react";
import * as Yup from "yup";
import api from "@/services/api";
import { App } from "antd";
import { useRenstraFormTemplate } from "./useRenstraFormTemplate";

const schema = Yup.object().shape({
  strategi_id: Yup.number().required("Strategi Renstra wajib dipilih"),
  rpjmd_arah_id: Yup.number().required("Arah Kebijakan RPJMD wajib dipilih"),
  kode_kebjkn: Yup.string().nullable(),
  deskripsi: Yup.string().required("Isi Kebijakan wajib diisi"),
  prioritas: Yup.string().required("Prioritas wajib dipilih"),
  no_arah_rpjmd: Yup.string().nullable(),
  isi_arah_rpjmd: Yup.string().nullable(),
  jenisDokumen: Yup.string().nullable(),
  tahun: Yup.string().nullable(),
  renstra_id: Yup.number().required("Renstra ID tidak ditemukan"),
});

const defaultValues = {
  strategi_id: "",
  rpjmd_arah_id: "",
  kode_kebjkn: "",
  deskripsi: "",
  prioritas: null,
  no_arah_rpjmd: "",
  isi_arah_rpjmd: "",
  jenisDokumen: "",
  tahun: "",
  renstra_id: "",
};

const generatePayload = (formData) => ({
  strategi_id: formData.strategi_id,
  rpjmd_arah_id: formData.rpjmd_arah_id,
  kode_kebjkn: formData.kode_kebjkn,
  deskripsi: formData.deskripsi,
  prioritas: formData.prioritas,
  no_arah_rpjmd: formData.no_arah_rpjmd,
  isi_arah_rpjmd: formData.isi_arah_rpjmd,
  jenisDokumen: formData.jenisDokumen,
  tahun: formData.tahun,
  renstra_id: formData.renstra_id,
});

export const useKebijakanRenstraForm = (initialData, renstraAktif) => {
  const [mutationResultData, setMutationResultData] = useState(null);
  const { message } = App.useApp();
  const [arahKebijakanFiltered, setArahKebijakanFiltered] = useState([]);

  const {
    form,
    onSubmit,
    isSubmitting,
    isLoading: isDropdownsLoading,
    dropdowns,
  } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/renstra-kebijakan",
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-kebijakan"],
    redirectPath: "/renstra/kebijakan",
    fetchOptions: {
      "renstra-strategi": () =>
        api.get("/renstra-strategi").then((res) => res.data?.data || []),
    },
    onMutationSuccess: (data) => setMutationResultData(data),
  });

  const { setValue, watch, reset } = form;

  const selectedStrategiId = watch("strategi_id");
  const selectedArahId = watch("rpjmd_arah_id");
  const normalizeId = (value) =>
    value === undefined || value === null || value === "" ? "" : String(value);

  useEffect(() => {
    const loadArahKebijakan = async () => {
      if (!selectedStrategiId) {
        setArahKebijakanFiltered([]);
        setValue("rpjmd_arah_id", "");
        return;
      }

      try {
        const res = await api.get("/arah-kebijakan", {
          params: {
            jenis_dokumen: "rpjmd",
            tahun: initialData?.tahun || renstraAktif?.tahun_mulai,
            page: 1,
            limit: 1000,
            renstra_strategi_id: selectedStrategiId,
          },
        });

        setArahKebijakanFiltered(res.data?.data || []);
        setValue("rpjmd_arah_id", "");
        setValue("no_arah_rpjmd", "");
        setValue("isi_arah_rpjmd", "");
        setValue("kode_kebjkn", "");
        setValue("deskripsi", "");
      } catch (err) {
        console.error("Gagal load arah kebijakan filtered:", err);
        setArahKebijakanFiltered([]);
      }
    };

    loadArahKebijakan();
  }, [selectedStrategiId, initialData?.tahun, renstraAktif?.tahun_mulai, setValue]);

  useEffect(() => {
    if (!initialData) {
      reset({
        ...defaultValues,
        renstra_id: renstraAktif?.id || "",
        kode_kebjkn: "",
      });
    } else {
      reset(initialData);
      if (initialData.kode_kebjkn) {
        setValue("kode_kebjkn", initialData.kode_kebjkn);
      }
    }
  }, [initialData, renstraAktif?.id, reset, setValue]);

  useEffect(() => {
    const selectedId = selectedArahId;
    const renstraId = initialData?.renstra_id || renstraAktif?.id;
    const arahOptions = dropdowns?.["arah-kebijakan"] || [];

    if (!selectedId) {
      setValue("kode_kebjkn", "");
      return;
    }

    const selected = arahOptions.find(
      (item) => normalizeId(item.id) === normalizeId(selectedId),
    );

    if (selected) {
      setValue("no_arah_rpjmd", selected.kode_arah || "");
      setValue("isi_arah_rpjmd", selected.deskripsi || "");
      setValue("deskripsi", selected.deskripsi || "");
      setValue("jenisDokumen", selected.jenis_dokumen || "");
      setValue("tahun", selected.tahun || "");
    }

    if (initialData || !renstraId) return;

    const triggerAutoKode = async () => {
      try {
        const { data } = await api.get("/renstra-kebijakan/generate-kode-kebijakan", {
          params: { arah_kebijakan_id: selectedId, renstra_id: renstraId },
        });
        setValue("kode_kebjkn", data?.kode_otomatis || "");
      } catch (err) {
        console.error("Error kode otomatis:", err);
        message.error("Gagal menghasilkan kode kebijakan otomatis.");
        setValue("kode_kebjkn", "");
      }
    };

    triggerAutoKode();
  }, [selectedArahId, dropdowns?.["arah-kebijakan"], initialData, message, renstraAktif?.id, setValue]);

  const handleArahKebijakanChange = useCallback(
    (value) => {
      const selected = dropdowns?.["arah-kebijakan"]?.find(
        (item) => normalizeId(item.id) === normalizeId(value),
      );

      if (selected) {
        setValue("no_arah_rpjmd", selected.kode_arah || "");
        setValue("isi_arah_rpjmd", selected.deskripsi || "");
        setValue("kode_kebjkn", selected.kode_arah || "");
        setValue("deskripsi", selected.deskripsi || "");
        setValue("jenisDokumen", selected.jenis_dokumen || "");
        setValue("tahun", selected.tahun || "");
      } else {
        setValue("no_arah_rpjmd", "");
        setValue("isi_arah_rpjmd", "");
        setValue("jenisDokumen", "");
        setValue("tahun", "");
        setValue("kode_kebjkn", "");
        setValue("deskripsi", "");
      }
    },
    [dropdowns, setValue],
  );

  const handleStrategiChange = (value) => {
    setValue("strategi_id", value);
  };

  const totalLoading = isSubmitting || isDropdownsLoading;

  const dropdownsFinal = {
    ...dropdowns,
    "arah-kebijakan": arahKebijakanFiltered,
  };

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    isLoading: totalLoading,
    dropdowns: dropdownsFinal,
    handleArahKebijakanChange,
    handleStrategiChange,
  };
};
