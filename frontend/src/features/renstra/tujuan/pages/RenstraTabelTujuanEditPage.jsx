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
    queryFn: async () => (await api.get("/renstra-opd/aktif")).data.data,
  });

  const { data: initialData, isLoading: loadingDetail } = useQuery({
    queryKey: ["renstra-tabel-tujuan", id],
    queryFn: async () => (await api.get(`/renstra-tabel-tujuan/${id}`)).data,
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
