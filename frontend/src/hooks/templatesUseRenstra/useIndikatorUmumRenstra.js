// src/features/renstra/indikator/hooks/useIndikatorUmumRenstraForm.js

import * as Yup from "yup";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";

// ✅ Schema sesuai field backend
const getSchema = () =>
  Yup.object({
    renstra_id: Yup.number().required("Renstra ID wajib diisi"),
    kode_indikator: Yup.string().required("Kode indikator wajib diisi"),
    nama_indikator: Yup.string().required("Nama indikator wajib diisi"),
    satuan: Yup.string().required("Satuan wajib diisi"),
    target_tahun_1: Yup.string().required("Target tahun 1 wajib diisi"),
    target_tahun_5: Yup.string().required("Target tahun 5 wajib diisi"),
  });

// ✅ Default values dinamis
const getDefaultValues = (renstraAktif) => ({
  renstra_id: renstraAktif?.id || "",
  kode_indikator: "",
  nama_indikator: "",
  satuan: "",
  target_tahun_1: "",
  target_tahun_5: "",
});

// ✅ Payload builder sesuai backend
const generatePayload = (data) => ({
  renstra_id: data.renstra_id,
  kode_indikator: data.kode_indikator,
  nama_indikator: data.nama_indikator,
  satuan: data.satuan,
  target_tahun_1: data.target_tahun_1,
  target_tahun_5: data.target_tahun_5,
});

// ✅ Hook utama
export const useIndikatorUmumRenstraForm = (
  initialData,
  renstraAktif,
  onSuccess
) => {
  return useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/indikator-renstra",
    schema: getSchema,
    defaultValues: getDefaultValues(renstraAktif),
    generatePayload,
    queryKeys: ["indikator-renstra"],
    redirectPath: "/renstra/indikator",
    onMutationSuccess: onSuccess,
  });
};
