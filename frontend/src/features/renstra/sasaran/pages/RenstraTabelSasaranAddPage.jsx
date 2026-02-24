// src/features/renstra/sasaran/pages/RenstraTabelSasaranAddPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

import SpinnerSasaranFullscreen from "../components/SpinnerSasaranFullscreen";
import RenstraTabelSasaranForm from "../components/RenstraTabelSasaranForm";

const RenstraTabelSasaranAddPage = () => {
  const navigate = useNavigate();

  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data.data;
    },
  });

  if (isLoading)
    return <SpinnerSasaranFullscreen tip="Memuat Renstra aktif..." />;

  return (
    <RenstraTabelSasaranForm
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/tabel/sasaran")}
    />
  );
};

export default RenstraTabelSasaranAddPage;
