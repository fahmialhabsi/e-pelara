// src/features/renstra/kegiatan/pages/RenstraTabelKegiatanAddPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

import SpinnerFullscreen from "../components/RenstraTableKegiatanSpinnerFullscreen";
import RenstraTabelKegiatanForm from "../components/RenstraTabelKegiatanForm";

const RenstraTabelKegiatanAddPage = () => {
  const navigate = useNavigate();

  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data.data;
    },
  });

  if (isLoading) {
    return <SpinnerFullscreen tip="Memuat Renstra aktif..." />;
  }

  return (
    <RenstraTabelKegiatanForm
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/tabel/kegiatan")}
    />
  );
};

export default RenstraTabelKegiatanAddPage;
