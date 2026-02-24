import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import * as Yup from "yup";
import api from "@/services/api";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";
import { useWatch } from "react-hook-form";

export const useStrategiRenstraForm = (initialData, renstraAktif) => {
  const schema = Yup.object().shape({
    sasaran_id: Yup.number().required("Sasaran Renstra wajib dipilih"),
    strategi_rpjmd_id: Yup.number().required("Strategi RPJMD wajib dipilih"),
    no_strategi: Yup.string().nullable(),
    deskripsi: Yup.string().required("Deskripsi Strategi wajib diisi"),
    renstra_id: Yup.number().required("Renstra wajib dipilih"),
    kebijakan_id: Yup.number().nullable(),
    program_id: Yup.number().nullable(),
    kegiatan_id: Yup.number().nullable(),
    subkegiatan_id: Yup.number().nullable(),
  });

  const defaultValues = {
    sasaran_id: "",
    strategi_rpjmd_id: "",
    no_strategi: "",
    deskripsi: "",
    renstra_id: "",
    kebijakan_id: null,
    program_id: null,
    kegiatan_id: null,
    subkegiatan_id: null,
    no_rpjmd: "",
    isi_strategi_rpjmd: "",
  };

  const generatePayload = useCallback(
    (formData) => ({
      sasaran_id: formData.sasaran_id,
      deskripsi: formData.deskripsi,
      renstra_id: formData.renstra_id,
      rpjmd_strategi_id: formData.strategi_rpjmd_id,
      kode_strategi: formData.no_strategi,
      no_rpjmd: formData.no_rpjmd,
      isi_strategi_rpjmd: formData.isi_strategi_rpjmd,
    }),
    []
  );

  const [mutationResultData, setMutationResultData] = useState(null);
  const hasResetInitialData = useRef(false);

  const currentRenstraId = useMemo(() => {
    return initialData?.renstra_id || renstraAktif?.id;
  }, [initialData?.renstra_id, renstraAktif?.id]);

  const fetchOptions = useMemo(
    () => ({
      "sasaran-renstra": () =>
        api.get("/renstra-sasaran").then((res) => res.data?.data || []),
      "strategi-rpjmd": () =>
        api
          .get("/strategi", {
            params: {
              jenis_dokumen: "RPJMD",
              tahun: renstraAktif?.tahun_mulai, // atau tahun_akhir tergantung kebutuhan
            },
          })
          .then((res) => res.data?.data || []),
      "tujuan-rpjmd": () =>
        api
          .get("/tujuan", {
            params: {
              jenis_dokumen: "RPJMD",
              tahun: renstraAktif?.tahun_mulai,
            },
          })
          .then((res) => res.data?.data || []),
      "arah-kebijakan": () =>
        api
          .get("/arah-kebijakan", {
            params: {
              jenis_dokumen: "RPJMD",
              tahun: renstraAktif?.tahun_mulai,
            },
          })
          .then((res) => res.data?.data || []),
    }),
    []
  );

  const {
    form,
    onSubmit,
    isSubmitting,
    isLoading: isDropdownsLoading,
    dropdowns,
  } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/renstra-strategi",
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-strategi"],
    redirectPath: "/renstra/strategi",
    fetchOptions,
    onMutationSuccess: setMutationResultData,
  });

  const { setValue, reset, control } = form;

  // 🔹 Auto set renstra_id & rpjmd_id dari renstraAktif (biar konsisten)
  useEffect(() => {
    if (renstraAktif?.id) {
      setValue("renstra_id", renstraAktif.id, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
    if (renstraAktif?.rpjmd_id) {
      setValue("rpjmd_id", renstraAktif.rpjmd_id, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [renstraAktif, setValue]);

  const watchedStrategiRpjmdId = useWatch({
    control,
    name: "strategi_rpjmd_id",
  });

  useEffect(() => {
    const selectedStrategi = dropdowns?.["strategi-rpjmd"]?.find(
      (item) => item.id === watchedStrategiRpjmdId
    );

    const currentNoStrategi = form.getValues("no_strategi");
    const currentNoRpjmd = form.getValues("no_rpjmd");
    const currentIsiStrategiRpjmd = form.getValues("isi_strategi_rpjmd");

    if (selectedStrategi) {
      if (
        currentNoStrategi !== selectedStrategi.kode_strategi ||
        currentNoRpjmd !== selectedStrategi.kode_strategi ||
        currentIsiStrategiRpjmd !== selectedStrategi.deskripsi
      ) {
        setValue("no_strategi", selectedStrategi.kode_strategi, {
          shouldDirty: false,
          shouldValidate: false,
        });

        setValue("no_rpjmd", selectedStrategi.kode_strategi, {
          shouldDirty: false,
          shouldValidate: false,
        });

        setValue("isi_strategi_rpjmd", selectedStrategi.deskripsi, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    } else {
      if (currentNoStrategi || currentNoRpjmd || currentIsiStrategiRpjmd) {
        setValue("no_strategi", "", {
          shouldDirty: false,
          shouldValidate: false,
        });
        setValue("no_rpjmd", "", { shouldDirty: false, shouldValidate: false });
        setValue("isi_strategi_rpjmd", "", {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }
  }, [watchedStrategiRpjmdId, dropdowns, setValue, form]);

  useEffect(() => {
    if (initialData && dropdowns?.["strategi-rpjmd"]?.length) {
      const selectedStrategi = dropdowns["strategi-rpjmd"].find(
        (item) => item.id === initialData.rpjmd_strategi_id
      );

      if (selectedStrategi) {
        setValue("strategi_rpjmd_id", selectedStrategi.id, {
          shouldDirty: false,
          shouldValidate: false,
        });

        setValue("no_strategi", selectedStrategi.kode_strategi, {
          shouldDirty: false,
          shouldValidate: false,
        });

        setValue("no_rpjmd", selectedStrategi.kode_strategi, {
          shouldDirty: false,
          shouldValidate: false,
        });

        setValue("isi_strategi_rpjmd", selectedStrategi.deskripsi, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }
  }, [initialData, dropdowns, setValue]);

  const totalLoading =
    isSubmitting ||
    isDropdownsLoading ||
    !dropdowns?.["sasaran-renstra"]?.length ||
    !dropdowns?.["strategi-rpjmd"]?.length;

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    isLoading: totalLoading,
    dropdowns,
    mutationResultData,
  };
};
