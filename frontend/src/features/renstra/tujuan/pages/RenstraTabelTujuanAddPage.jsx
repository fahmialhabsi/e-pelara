// src/features/renstra/tujuan/pages/RenstraTabelTujuanAddPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

import SpinnerFullscreen from "../components/SpinnerTujuanFullscreen";
import RenstraTabelTujuanForm from "../components/RenstraTabelTujuanForm";

const RenstraTabelTujuanAddPage = () => {
  const navigate = useNavigate();
  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => (await api.get("/renstra-opd/aktif")).data.data,
  });

  if (isLoading) return <SpinnerFullscreen tip="Memuat Renstra aktif..." />;

  return (
    <RenstraTabelTujuanForm
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/tabel/tujuan")}
    />
  );
};

export default RenstraTabelTujuanAddPage;
