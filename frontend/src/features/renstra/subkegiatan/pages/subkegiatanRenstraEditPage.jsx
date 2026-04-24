import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSubkegiatanRenstraById } from "../api/subkegiatanRenstraApi";
import SubkegiatanRenstraForm from "../components/SubkegiatanRenstraForm";
import api from "@/services/api";
import { mergeRenstraAktifForEdit } from "@/features/renstra/utils/mergeRenstraAktifForEdit";

const SubkegiatanRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading: loadingDetail } = useQuery({
    queryKey: ["subkegiatan-renstra", id],
    queryFn: async () => {
      const res = await fetchSubkegiatanRenstraById(id);
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
    <SubkegiatanRenstraForm
      initialData={data}
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/subkegiatan")}
    />
  );
};

export default SubkegiatanRenstraEditPage;
