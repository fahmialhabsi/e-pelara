// src/features/renstra/program/pages/RenstraTabelProgramAddPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

import SpinnerFullscreen from "../components/RenstraTableSpinnerFullscreen";
import RenstraTabelProgramForm from "../components/RenstraTabelProgramForm";

const RenstraTabelProgramAddPage = () => {
  const navigate = useNavigate();

  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ["renstra-opd-aktif"], // ✅ konsisten dengan ProgramRenstra
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif"); // ✅ endpoint benar
      return res.data.data;
    },
  });

  if (isLoading) {
    return <SpinnerFullscreen tip="Memuat Renstra aktif..." />;
  }

  return (
    <RenstraTabelProgramForm
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/tabel/program")}
    />
  );
};

export default RenstraTabelProgramAddPage;
