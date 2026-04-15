// src/hooks/templatesUseRenstra/useKebijakanRenstraForm.js
import { useCallback, useEffect, useState } from "react";
import * as Yup from "yup";
import api from "@/services/api";
import { message } from "antd";
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
      "arah-kebijakan": () =>
        api
          .get("/arah-kebijakan", {
            params: {
              jenis_dokumen: "RPJMD",
              tahun: renstraAktif?.tahun_mulai,
            },
          })
          .then((res) => res.data?.data || []),
    },
    onMutationSuccess: (data) => setMutationResultData(data),
  });

  const { control, setValue, watch, reset } = form;

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
    const selectedId = watch("rpjmd_arah_id");
    const arahOptions = dropdowns?.["arah-kebijakan"];
    const renstraId = initialData?.renstra_id || renstraAktif?.id;

    if (!initialData && selectedId && arahOptions?.length > 0 && renstraId) {
      const triggerAutoKode = async () => {
        try {
          const { data } = await api.get(
            "/renstra-kebijakan/generate-kode-kebijakan",
            { params: { arah_kebijakan_id: selectedId, renstra_id: renstraId } }
          );
          setValue("kode_kebjkn", data?.kode_otomatis || "");
        } catch (err) {
          console.error("Error kode otomatis:", err);
          message.error("Gagal menghasilkan kode kebijakan otomatis.");
          setValue("kode_kebjkn", "");
        }
      };
      triggerAutoKode();
    } else if (!selectedId) {
      setValue("kode_kebjkn", "");
    }
  }, [
    watch("rpjmd_arah_id"),
    dropdowns?.["arah-kebijakan"],
    initialData,
    renstraAktif?.id,
    setValue,
  ]);

  const handleArahKebijakanChange = useCallback(
    (value) => {
      const selected = dropdowns?.["arah-kebijakan"]?.find(
        (item) => item.id === value
      );
      if (selected) {
        setValue("no_arah_rpjmd", selected.kode_arah);
        setValue("isi_arah_rpjmd", selected.deskripsi);
        // 🔹 Auto-fill Isi Kebijakan dari deskripsi Arah Kebijakan RPJMD
        setValue("deskripsi", selected.deskripsi || "");
        setValue("jenisDokumen", selected.jenis_dokumen);
        setValue("tahun", selected.tahun);
      } else {
        setValue("no_arah_rpjmd", "");
        setValue("isi_arah_rpjmd", "");
        setValue("jenisDokumen", "");
        setValue("tahun", "");
        setValue("kode_kebjkn", "");
      }
    },
    [dropdowns, setValue]
  );

  const handleStrategiChange = (value) => {
    setValue("strategi_id", value);
  };

  const totalLoading = isSubmitting || isDropdownsLoading;

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    isLoading: totalLoading,
    dropdowns,
    handleArahKebijakanChange,
    handleStrategiChange,
  };
};
