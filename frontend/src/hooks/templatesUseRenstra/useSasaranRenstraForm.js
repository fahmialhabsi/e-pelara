// src/hooks/templatesUseRenstra/useSasaranRenstraForm.js
import * as Yup from "yup";
import { useRenstraFormTemplate } from "./useRenstraFormTemplate";
import api from "@/services/api";
import { useEffect } from "react";

const schema = Yup.object().shape({
  tujuan_id: Yup.string().required("Tujuan Renstra wajib dipilih"),
  rpjmd_sasaran_id: Yup.string().required("Sasaran RPJMD wajib dipilih"),
  nomor: Yup.string().nullable(),
  isi_sasaran: Yup.string().required("Isi Sasaran wajib diisi"),
  renstra_id: Yup.number().required(),
  no_rpjmd: Yup.string().nullable(),
  isi_sasaran_rpjmd: Yup.string().nullable(),
});

const defaultValues = {
  tujuan_id: "",
  rpjmd_sasaran_id: "",
  nomor: "",
  isi_sasaran: "",
  renstra_id: "",
  no_rpjmd: "",
  isi_sasaran_rpjmd: "",
};

const generatePayload = (formData) => ({
  tujuan_id: Number(formData.tujuan_id),
  rpjmd_sasaran_id: Number(formData.rpjmd_sasaran_id),
  nomor: formData.nomor,
  isi_sasaran: formData.isi_sasaran,
  renstra_id: formData.renstra_id,
  no_rpjmd: formData.no_rpjmd,
  isi_sasaran_rpjmd: formData.isi_sasaran_rpjmd,
});

export const useSasaranRenstraForm = (initialData, renstraAktif) => {
  const {
    form,
    onSubmit,
    isSubmitting,
    isLoading: isDropdownsLoading,
    dropdowns,
  } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/renstra-sasaran",
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ["renstra-sasaran"],
    redirectPath: "/renstra/sasaran",
    fetchOptions: {
      "renstra-tujuan": () => {
        if (!renstraAktif?.id) return Promise.resolve([]);
        return api
          .get("/renstra-tujuan", { params: { renstra_id: renstraAktif.id } })
          .then((res) => res.data);
      },
      "sasaran-rpjmd": () => {
        if (!renstraAktif?.id) return Promise.resolve([]);
        return api
          .get("/sasaran", {
            params: {
              jenis_dokumen: "renstra",
              tahun: renstraAktif?.tahun_mulai,
            },
          })
          .then((res) => res.data);
      },
    },
  });

  const { reset, setValue, watch } = form;

  const watchedTujuanId = watch("tujuan_id");

  useEffect(() => {
    const tujuanOptionsReady = dropdowns["renstra-tujuan"]?.length > 0;
    const rpjmdOptionsReady = dropdowns["sasaran-rpjmd"]?.length > 0;

    if (!tujuanOptionsReady || !rpjmdOptionsReady) return;

    if (!initialData) {
      reset({
        ...defaultValues,
        renstra_id: renstraAktif?.id || "",
      });
    } else {
      reset({
        ...initialData,
        tujuan_id: String(initialData?.tujuan_id ?? ""),
        rpjmd_sasaran_id: String(initialData?.rpjmd_sasaran_id ?? ""),
      });
    }
  }, [initialData, renstraAktif?.id, reset, dropdowns]);

  // Update nomor otomatis berdasarkan jumlah Sasaran Renstra saat ini
  useEffect(() => {
    if (!watchedTujuanId) return;

    const tujuan = dropdowns["renstra-tujuan"]?.find(
      (t) => String(t.id) === String(watchedTujuanId)
    );
    if (!tujuan) return;

    api
      .get("/renstra-sasaran", { params: { tujuan_id: watchedTujuanId } })
      .then((res) => {
        const count = Array.isArray(res.data) ? res.data.length : 0;
        const noTujuan = tujuan.no_tujuan.replace(/^T/, "");
        setValue("nomor", `STR${noTujuan}.${count + 1}`);
      });
  }, [watchedTujuanId, dropdowns, setValue]);

  const totalLoading =
    isSubmitting || !dropdowns["renstra-tujuan"] || !dropdowns["sasaran-rpjmd"];

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    isLoading: totalLoading,
    dropdowns,
  };
};
