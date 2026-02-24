// src/features/renstra/sasaran/pages/RenstraTabelSasaranEditPage.jsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

import SpinnerSasaranFullscreen from "../components/SpinnerSasaranFullscreen";
import RenstraTabelSasaranForm from "../components/RenstraTabelSasaranForm";

const RenstraTabelSasaranEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: renstraAktif, isLoading: loadingRenstra } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data.data;
    },
  });

  const { data: initialData, isLoading: loadingDetail } = useQuery({
    queryKey: ["renstra-tabel-sasaran", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-tabel-sasaran/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (loadingRenstra || loadingDetail)
    return <SpinnerSasaranFullscreen tip="Memuat data untuk edit..." />;

  return (
    <RenstraTabelSasaranForm
      initialData={initialData}
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/tabel/sasaran")}
    />
  );
};

export default RenstraTabelSasaranEditPage;
