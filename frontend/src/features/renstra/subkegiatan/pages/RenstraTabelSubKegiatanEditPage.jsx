// src/features/renstra/subkegiatan/pages/RenstraTabelSubKegiatanEditPage.jsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

import SpinnerFullscreen from "../components/RenstraTableSubKegiatanSpinnerFullscreen";
import RenstraTabelSubKegiatanForm from "../components/RenstraTabelSubKegiatanForm";

const RenstraTabelSubKegiatanEditPage = () => {
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
    queryKey: ["renstra-tabel-subkegiatan", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-tabel-subkegiatan/${id}`);
      return res.data.data; // ✅ ambil data yang benar
    },
    enabled: !!id,
  });

  if (loadingRenstra || loadingDetail) {
    return <SpinnerFullscreen tip="Memuat data untuk edit..." />;
  }

  return (
    <RenstraTabelSubKegiatanForm
      initialData={initialData}
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/tabel/subkegiatan")}
    />
  );
};

export default RenstraTabelSubKegiatanEditPage;
