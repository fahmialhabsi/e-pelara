// src/features/renstra/subkegiatan/pages/RenstraTabelSubKegiatanAddPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

import SpinnerFullscreen from "../components/RenstraTableSubKegiatanSpinnerFullscreen";
import RenstraTabelSubKegiatanForm from "../components/RenstraTabelSubKegiatanForm";

const RenstraTabelSubKegiatanAddPage = () => {
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
    <RenstraTabelSubKegiatanForm
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/tabel/subkegiatan")}
    />
  );
};

export default RenstraTabelSubKegiatanAddPage;
