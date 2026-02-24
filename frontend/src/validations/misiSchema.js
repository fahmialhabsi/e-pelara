// src/validations/misiSchema.js
import * as Yup from "yup";
import { LEVEL_DOKUMEN_OPTIONS, JENIS_IKU_OPTIONS } from "@/utils/constants";

const ENUM_LEVEL_DOKUMEN = LEVEL_DOKUMEN_OPTIONS.map((o) => o.value);
const ENUM_JENIS_IKU = JENIS_IKU_OPTIONS.map((o) => o.value);

export const misiSchema = Yup.object({
  misi_id: Yup.number().required("Misi wajib dipilih"),
  level_dokumen: Yup.string()
    .oneOf(ENUM_LEVEL_DOKUMEN, "Level dokumen tidak valid")
    .required("Level dokumen wajib dipilih"),
  jenis_iku: Yup.string()
    .oneOf(ENUM_JENIS_IKU, "Jenis IKU tidak valid")
    .required("Jenis IKU wajib dipilih"),
});
