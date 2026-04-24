import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProgramRenstraById } from "../api/programRenstraApi";
import ProgramRenstraForm from "../components/programRenstraForm";
import api from "@/services/api";
import { mergeRenstraAktifForEdit } from "@/features/renstra/utils/mergeRenstraAktifForEdit";

const ProgramRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: row, isLoading, isError, error } = useQuery({
    queryKey: ["program-renstra", id],
    queryFn: async () => {
      const res = await fetchProgramRenstraById(id);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });

  const { data: renstraAktifFallback, isLoading: loadingRenstra } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data?.data ?? res.data;
    },
  });

  const initialData = useMemo(() => {
    if (!row) return null;
    return {
      ...row,
      program_rpjmd_id:
        row.rpjmd_program_id != null ? String(row.rpjmd_program_id) : "",
    };
  }, [row]);

  const renstraAktif = useMemo(
    () => mergeRenstraAktifForEdit(row?.renstra, renstraAktifFallback),
    [row?.renstra, renstraAktifFallback]
  );

  if (isLoading || loadingRenstra) return <div>⏳ Memuat data...</div>;
  if (isError) return <div>❌ Gagal memuat data: {error.message}</div>;
  if (!initialData) return <div>Data tidak ditemukan.</div>;

  return (
    <ProgramRenstraForm
      initialData={initialData}
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/program")}
    />
  );
};

export default ProgramRenstraEditPage;
