// src/validations/yupHelpers.js
import * as Yup from "yup";

export const numberOrStringValidation = (label = "Target") =>
  Yup.mixed().when("jenis_indikator", ([jenis], schema) => {
    return jenis === "Kuantitatif"
      ? Yup.number()
          .typeError(`${label} harus berupa angka`)
          .required(`${label} wajib diisi`)
      : Yup.string().required(`${label} wajib diisi`);
  });
