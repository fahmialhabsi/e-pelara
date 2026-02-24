// src/features/renstra/kegiatan/pages/RenstraTabelKegiatanEditPage.jsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

import SpinnerFullscreen from "../components/RenstraTableKegiatanSpinnerFullscreen";
import RenstraTabelKegiatanForm from "../components/RenstraTabelKegiatanForm";

const RenstraTabelKegiatanEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Ambil renstra aktif
  const { data: renstraAktif, isLoading: loadingRenstra } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data.data;
    },
  });

  // Ambil detail kegiatan
  const { data: initialData, isLoading: loadingDetail } = useQuery({
    queryKey: ["renstra-tabel-kegiatan", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-tabel-kegiatan/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (loadingRenstra || loadingDetail) {
    return <SpinnerFullscreen tip="Memuat data untuk edit..." />;
  }

  return (
    <RenstraTabelKegiatanForm
      initialData={initialData}
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/tabel/kegiatan")}
    />
  );
};

export default RenstraTabelKegiatanEditPage;
