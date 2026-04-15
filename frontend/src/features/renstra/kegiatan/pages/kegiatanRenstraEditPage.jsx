import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchKegiatanRenstraById } from "../api/kegiatanRenstraApi";
import KegiatanRenstraForm from "../components/KegiatanRenstraForm";
import api from "@/services/api";
import { mergeRenstraAktifForEdit } from "@/features/renstra/utils/mergeRenstraAktifForEdit";

const KegiatanRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading: loadingDetail } = useQuery({
    queryKey: ["kegiatan-renstra", id],
    queryFn: async () => {
      const res = await fetchKegiatanRenstraById(id);
      const row = res.data?.data ?? res.data;
      return row;
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

  const isLoading = loadingDetail || loadingRenstra;

  const renstraAktif = useMemo(
    () => mergeRenstraAktifForEdit(data?.renstra, renstraAktifFallback),
    [data?.renstra, renstraAktifFallback]
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <KegiatanRenstraForm
      initialData={data}
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/kegiatan")}
    />
  );
};

export default KegiatanRenstraEditPage;
