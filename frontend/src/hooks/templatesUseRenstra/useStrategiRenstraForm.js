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
        api.get("/renstra-sasaran").then((res) => {
          const rows = res.data?.data ?? res.data ?? [];
          const list = Array.isArray(rows) ? rows : [];
          const rid = renstraAktif?.id ?? initialData?.renstra_id;
          return rid
            ? list.filter((s) => Number(s.renstra_id) === Number(rid))
            : list;
        }),
      "strategi-rpjmd": () =>
        api
          .get("/strategi", {
            params: {
              jenis_dokumen: "RPJMD",
              tahun: renstraAktif?.tahun_mulai,
            },
          })
          .then((res) => res.data?.data || res.data || []),
      "tujuan-rpjmd": () =>
        api
          .get("/tujuan", {
            params: {
              jenis_dokumen: "RPJMD",
              tahun: renstraAktif?.tahun_mulai,
            },
          })
          .then((res) => res.data?.data || res.data || []),
      "arah-kebijakan": () =>
        api
          .get("/arah-kebijakan", {
            params: {
              jenis_dokumen: "RPJMD",
              tahun: renstraAktif?.tahun_mulai,
            },
          })
          .then((res) => res.data?.data || res.data || []),
    }),
    [renstraAktif?.id, renstraAktif?.tahun_mulai, initialData?.renstra_id]
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

  useEffect(() => {
    if (!initialData?.id || initialData.sasaran_id == null) return;
    setValue("sasaran_id", Number(initialData.sasaran_id), {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [initialData?.id, initialData?.sasaran_id, setValue]);

  // renstra_id dari aktif hanya untuk tambah — edit pakai nilai record
  useEffect(() => {
    if (initialData?.id) return;
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
  }, [renstraAktif, setValue, initialData?.id]);

  const watchedStrategiRpjmdId = useWatch({
    control,
    name: "strategi_rpjmd_id",
  });

  useEffect(() => {
    const selectedStrategi = dropdowns?.["strategi-rpjmd"]?.find(
      (item) => Number(item.id) === Number(watchedStrategiRpjmdId)
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

        if (!initialData?.id) {
          setValue("deskripsi", selectedStrategi.deskripsi || "", {
            shouldDirty: false,
            shouldValidate: false,
          });
        }
      }
    } else if (!initialData?.id) {
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
  }, [watchedStrategiRpjmdId, dropdowns, setValue, form, initialData?.id]);

  useEffect(() => {
    if (!initialData?.id || !dropdowns?.["strategi-rpjmd"]?.length) return;

    const sid =
      initialData.rpjmd_strategi_id ?? initialData.strategi_rpjmd_id;
    const selectedStrategi = dropdowns?.["strategi-rpjmd"]?.find(
      (item) => Number(item.id) === Number(sid)
    );

    if (selectedStrategi) {
      setValue("strategi_rpjmd_id", Number(selectedStrategi.id), {
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
    } else {
      const kode = initialData.kode_strategi ?? initialData.no_strategi ?? "";
      const noR = initialData.no_rpjmd ?? kode;
      const isi = initialData.isi_strategi_rpjmd ?? "";
      if (sid != null) {
        setValue("strategi_rpjmd_id", Number(sid), {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
      setValue("no_strategi", kode, { shouldDirty: false, shouldValidate: false });
      setValue("no_rpjmd", noR, { shouldDirty: false, shouldValidate: false });
      setValue("isi_strategi_rpjmd", isi, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [initialData, dropdowns, setValue]);

  // Gunakan isDropdownsLoading dari template (bukan .length) agar tidak
  // loading selamanya jika API mengembalikan array kosong [].
  const totalLoading =
    isSubmitting ||
    isDropdownsLoading ||
    dropdowns?.["sasaran-renstra"] === null ||
    dropdowns?.["strategi-rpjmd"] === null;

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    isLoading: totalLoading,
    dropdowns,
    mutationResultData,
  };
};
