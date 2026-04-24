// src/features/renstra/indikator/hooks/useIndikatorRenstraForm.js

import * as Yup from "yup";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";

// ✅ Schema validasi
const getSchema = () =>
  Yup.object({
    renstra_id: Yup.number().required("Renstra ID wajib diisi"),
    ref_id: Yup.number().required("Ref ID wajib diisi"),
    stage: Yup.string()
      .oneOf([
        "tujuan",
        "sasaran",
        "strategi",
        "kebijakan",
        "program",
        "kegiatan",
        "sub_kegiatan",
      ])
      .required("Stage wajib dipilih"),
    kode_indikator: Yup.string().required("Kode indikator wajib diisi"),
    nama_indikator: Yup.string().required("Nama indikator wajib diisi"),
    satuan: Yup.string().required("Satuan wajib diisi"),
    jenis_indikator: Yup.string()
      .oneOf(["Kuantitatif", "Kualitatif"])
      .required("Jenis indikator wajib diisi"),
    tipe_indikator: Yup.string()
      .oneOf(["Impact", "Outcome", "Output", "Proses"])
      .required("Tipe indikator wajib diisi"),
    target_tahun_1: Yup.number().nullable(),
    target_tahun_2: Yup.number().nullable(),
    target_tahun_3: Yup.number().nullable(),
    target_tahun_4: Yup.number().nullable(),
    target_tahun_5: Yup.number().nullable(),
  });

// ✅ Default values (force inject renstra_id)
const getDefaultValues = (renstraAktif) => ({
  renstra_id: renstraAktif?.id || "",
  ref_id: "",
  stage: "tujuan",
  kode_indikator: "",
  nama_indikator: "",
  satuan: "",
  jenis_indikator: "Kuantitatif",
  tipe_indikator: "Output",
  target_tahun_1: null,
  target_tahun_2: null,
  target_tahun_3: null,
  target_tahun_4: null,
  target_tahun_5: null,
});

// ✅ Payload builder
const generatePayload = (data, renstraAktif) => ({
  renstra_id: data.renstra_id || renstraAktif?.id,
  ref_id: data.ref_id,
  stage: data.stage,
  kode_indikator: data.kode_indikator,
  nama_indikator: data.nama_indikator,
  satuan: data.satuan,
  jenis_indikator: data.jenis_indikator,
  tipe_indikator: data.tipe_indikator,
  target_tahun_1: data.target_tahun_1 === "" ? null : data.target_tahun_1,
  target_tahun_2: data.target_tahun_2 === "" ? null : data.target_tahun_2,
  target_tahun_3: data.target_tahun_3 === "" ? null : data.target_tahun_3,
  target_tahun_4: data.target_tahun_4 === "" ? null : data.target_tahun_4,
  target_tahun_5: data.target_tahun_5 === "" ? null : data.target_tahun_5,
});

// ✅ Hook utama
export const useIndikatorRenstraForm = (
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
    generatePayload: (data) => generatePayload(data, renstraAktif),
    queryKeys: ["indikator-renstra"],
    redirectPath: "/renstra/indikator",
    onMutationSuccess: onSuccess,
  });
};
