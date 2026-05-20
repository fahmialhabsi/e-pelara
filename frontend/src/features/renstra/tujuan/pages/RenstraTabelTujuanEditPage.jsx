// src/features/renstra/tujuan/pages/RenstraTabelTujuanEditPage.jsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

import SpinnerFullscreen from "../components/SpinnerTujuanFullscreen";
import RenstraTabelTujuanForm from "../components/RenstraTabelTujuanForm";

const RenstraTabelTujuanEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: renstraAktif, isLoading: loadingRenstra } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd?is_aktif=true");
      if (Array.isArray(res.data?.data)) {
        return res.data.data[0] || null;
      }
      return res.data?.data ?? res.data ?? null;
    },
  });

  const { data: initialData, isLoading: loadingDetail } = useQuery({
    queryKey: ["renstra-tabel-tujuan", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-tabel-tujuan/${id}`);
      return res.data?.data ?? res.data ?? null;
    },
    enabled: !!id,
  });

  if (loadingRenstra || loadingDetail)
    return <SpinnerFullscreen tip="Memuat data untuk edit..." />;

  return (
    <RenstraTabelTujuanForm
      initialData={initialData}
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/tabel/tujuan")}
    />
  );
};

export default RenstraTabelTujuanEditPage;
