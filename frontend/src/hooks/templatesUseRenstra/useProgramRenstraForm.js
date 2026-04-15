// src/features/renstra/program/hooks/useProgramRenstraForm.js
import * as Yup from "yup";
import api from "@/services/api";
import { useRenstraFormTemplate } from "@/hooks/templatesUseRenstra/useRenstraFormTemplate";

const getSchema = () =>
  Yup.object().shape({
    rpjmd_id: Yup.number().required("RPJMD wajib dipilih"),
    program_rpjmd_id: Yup.number().required("Program RPJMD wajib dipilih"),
    no_program: Yup.string().required("Nomor Program wajib diisi"),
    isi_program: Yup.string().required("Isi Program wajib diisi"),
    renstra_id: Yup.number().required("Renstra ID tidak ditemukan"),
  });

const getDefaultValues = (renstraAktif) => ({
  rpjmd_id: "",
  program_rpjmd_id: "",
  no_program: "",
  isi_program: "",
  renstra_id: renstraAktif?.id || "",
});

const generatePayload = (data) => ({
  rpjmd_id: data.rpjmd_id,
  rpjmd_program_id: data.program_rpjmd_id,
  no_program: data.no_program,
  isi_program: data.isi_program,
  renstra_id: data.renstra_id,
});

export const useProgramRenstraForm = (
  initialData = null,
  renstraAktif = {}
) => {
  return useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: "/renstra-program",
    schema: getSchema,
    defaultValues: getDefaultValues(renstraAktif),
    generatePayload,
    queryKeys: ["renstra-program"],
    redirectPath: "/renstra/program",
    fetchOptions: {
      "rpjmd-list": () => api.get("/rpjmd").then((res) => res.data),
      "program-rpjmd": () => api.get("/program").then((res) => res.data),
    },
  });
};
