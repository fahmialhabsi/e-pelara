// src/hooks/templatesUseRenstra/useTujuanRenstraForm.js
import * as Yup from "yup";
import api from "@/services/api";
import { useRenstraFormTemplate } from "./useRenstraFormTemplate";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { message } from "antd";
import { useMemo } from "react";

// Validasi schema
const schema = Yup.object().shape({
  misi_id: Yup.number().nullable(),
  rpjmd_tujuan_id: Yup.number()
    .typeError("Tujuan RPJMD wajib dipilih")
    .required("Tujuan RPJMD wajib dipilih"),
  no_tujuan: Yup.string().nullable(),
  isi_tujuan: Yup.string().required("Isi Tujuan wajib diisi"),
  renstra_id: Yup.number().required("Renstra wajib dipilih"),
  no_rpjmd: Yup.string().nullable(),
  isi_tujuan_rpjmd: Yup.string().nullable(),
});

// Payload ke backend
const generatePayload = (formData) => ({
  misi_id: formData.misi_id || null,
  rpjmd_tujuan_id: formData.rpjmd_tujuan_id || null,
  no_tujuan: formData.no_tujuan,
  isi_tujuan: formData.isi_tujuan,
  renstra_id: formData.renstra_id || null,
  no_rpjmd: formData.no_rpjmd,
  isi_tujuan_rpjmd: formData.isi_tujuan_rpjmd,
});

export const useTujuanRenstraForm = (initialData, renstraAktif) => {
  const [mutationResultData, setMutationResultData] = useState(null);
  const renstraId = initialData?.renstra_id || renstraAktif?.id;

  const defaultValues = useMemo(
    () => ({
      misi_id: null,
      rpjmd_tujuan_id: null,
      no_tujuan: "",
      isi_tujuan: "",
      renstra_id: renstraId || null,
      no_rpjmd: "",
      isi_tujuan_rpjmd: "",
    }),
    [renstraId]
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
    endpoint: "/renstra-tujuan",
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-tujuan"],
    redirectPath: "/renstra/tujuan",
    fetchOptions: {
      "tujuan-rpjmd": () =>
        api
          .get("/tujuan", {
            params: {
              jenis_dokumen: "renstra",
              tahun: renstraAktif?.tahun_mulai,
            },
          })
          .then((res) => res.data),

      "sasaran-rpjmd": () =>
        api
          .get("/sasaran", {
            params: {
              jenis_dokumen: "renstra",
              tahun: renstraAktif?.tahun_mulai,
            },
          })
          .then((res) => res.data),
    },

    onMutationSuccess: (dataFromBackend) => {
      setMutationResultData(dataFromBackend);
    },
  });

  const { control, setValue, reset } = form;

  const selectedTujuanId = useWatch({ control, name: "rpjmd_tujuan_id" });
  const nomorFetchedRef = useRef(null);

  // Generate nomor otomatis
  useEffect(() => {
    const options = dropdowns?.["tujuan-rpjmd"];

    if (
      !initialData &&
      selectedTujuanId &&
      options?.length > 0 &&
      renstraId &&
      nomorFetchedRef.current !== selectedTujuanId
    ) {
      const generate = async () => {
        try {
          const res = await api.get("/renstra-tujuan/generate-nomor-tujuan", {
            params: { tujuan_id: selectedTujuanId, renstra_id: renstraId },
          });
          const nomor = res.data?.nomor_otomatis;
          if (nomor) {
            setValue("no_tujuan", nomor, { shouldDirty: false });
            nomorFetchedRef.current = selectedTujuanId;
          }
        } catch (err) {
          message.error("Gagal generate nomor tujuan otomatis.");
          setValue("no_tujuan", "", { shouldDirty: false });
        }
      };
      generate();
    } else if (!initialData && !selectedTujuanId) {
      setValue("no_tujuan", "", { shouldDirty: false });
      nomorFetchedRef.current = null;
    }
  }, [
    selectedTujuanId,
    dropdowns?.["tujuan-rpjmd"],
    initialData,
    renstraId,
    setValue,
  ]);

  // Set default value
  useEffect(() => {
    if (!initialData) {
      reset({ ...defaultValues, renstra_id: renstraId });
    } else {
      reset(initialData);
    }
  }, [initialData, renstraId, reset]);

  // Handler perubahan dropdown Tujuan RPJMD
  const handleTujuanChange = useCallback(
    (id) => {
      setValue("rpjmd_tujuan_id", id);
      const selected = dropdowns?.["tujuan-rpjmd"]?.find(
        (item) => item.id === id
      );

      if (selected) {
        setValue("misi_id", selected.misi_id);
        setValue("no_rpjmd", selected.no_tujuan);
        setValue("isi_tujuan_rpjmd", selected.isi_tujuan);
      } else {
        setValue("misi_id", "");
        setValue("no_rpjmd", "");
        setValue("isi_tujuan_rpjmd", "");
      }
    },
    [dropdowns?.["tujuan-rpjmd"], setValue]
  );

  const totalLoading =
    isSubmitting ||
    !dropdowns?.["tujuan-rpjmd"] ||
    !dropdowns?.["sasaran-rpjmd"];

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    isLoading: totalLoading,
    dropdowns,
    handleTujuanChange,
  };
};
