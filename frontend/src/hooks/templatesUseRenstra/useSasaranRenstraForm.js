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
    skipInitialDataReset: true,
    fetchOptions: {
      // Dropdown Tujuan Renstra (OPD): tujuan yang sudah dibuat di modul Renstra
      "renstra-tujuan": () => {
        if (!renstraAktif?.id) return Promise.resolve([]);
        return api
          .get("/renstra-tujuan", { params: { renstra_id: renstraAktif.id } })
          .then((res) => {
            // Controller mengembalikan array langsung
            const raw = res.data;
            return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
          });
      },
      // sasaran-rpjmd di-fetch agar totalLoading tidak stuck;
      // Form pakai endpoint /renstra-sasaran/sasaran-rpjmd?tujuan_id=X (by-tujuan) untuk dropdown
      "sasaran-rpjmd": () => {
        if (!renstraAktif?.id) return Promise.resolve([]);
        return api
          .get("/sasaran", {
            params: {
              jenis_dokumen: "rpjmd",
              tahun: renstraAktif?.tahun_mulai,
              limit: 500,
            },
          })
          .then((res) => {
            const raw = res.data;
            return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
          });
      },
    },
  });

  const { reset, setValue, watch } = form;

  const watchedTujuanId = watch("tujuan_id");

  // Edit: isi form dari API segera — jangan tunggu dropdown tujuan (bisa [] jika filter/API beda).
  // Tanpa ini + skipInitialDataReset, field tetap kosong selamanya.
  useEffect(() => {
    if (!initialData?.id) return;
    const rid = initialData.renstra_id ?? renstraAktif?.id;
    reset({
      ...initialData,
      tujuan_id: String(initialData.tujuan_id ?? ""),
      rpjmd_sasaran_id: String(initialData.rpjmd_sasaran_id ?? ""),
      renstra_id: rid != null && rid !== "" ? Number(rid) : "",
    });
  }, [initialData, renstraAktif?.id, reset]);

  // Tambah: tunggu daftar Tujuan Renstra siap
  useEffect(() => {
    if (initialData?.id) return;
    if (!dropdowns?.["renstra-tujuan"]?.length) return;
    reset({
      ...defaultValues,
      renstra_id: renstraAktif?.id != null ? Number(renstraAktif.id) : "",
    });
  }, [initialData?.id, renstraAktif?.id, reset, dropdowns]);

  // Generate nomor otomatis hanya saat tambah — jangan timpa nomor record edit
  useEffect(() => {
    if (initialData?.id) return;
    if (!watchedTujuanId) return;

    const tujuan = dropdowns?.["renstra-tujuan"]?.find(
      (t) => String(t.id) === String(watchedTujuanId)
    );
    if (!tujuan) return;

    api
      .get("/renstra-sasaran", { params: { tujuan_id: watchedTujuanId } })
      .then((res) => {
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        const count = list.length;
        const noTujuan = String(tujuan.no_tujuan || "").replace(/^T/, "");
        setValue("nomor", `STR${noTujuan}.${count + 1}`);
      });
  }, [watchedTujuanId, dropdowns, setValue, initialData?.id]);

  const totalLoading =
    isSubmitting || !dropdowns?.["renstra-tujuan"] || !dropdowns?.["sasaran-rpjmd"];

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    isLoading: totalLoading,
    dropdowns,
  };
};
