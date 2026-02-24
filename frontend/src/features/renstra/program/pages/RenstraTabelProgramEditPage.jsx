// src/features/renstra/program/pages/RenstraTabelProgramEditPage.jsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

import SpinnerFullscreen from "../components/RenstraTableSpinnerFullscreen";
import RenstraTabelProgramForm from "../components/RenstraTabelProgramForm";

const RenstraTabelProgramEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // ✅ Ambil renstra aktif
  const { data: renstraAktif, isLoading: loadingRenstra } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data.data;
    },
  });

  // ✅ Ambil detail program berdasarkan id
  const { data: initialData, isLoading: loadingDetail } = useQuery({
    queryKey: ["renstra-tabel-program", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-tabel-program/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // ✅ Spinner saat salah satu loading
  if (loadingRenstra || loadingDetail) {
    return <SpinnerFullscreen tip="Memuat data untuk edit..." />;
  }

  return (
    <RenstraTabelProgramForm
      initialData={initialData}
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/tabel/program")}
    />
  );
};

export default RenstraTabelProgramEditPage;
