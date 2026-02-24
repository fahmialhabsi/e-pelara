import React from "react";
import ProgramRenstraForm from "../components/ProgramRenstraForm";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

const ProgramRenstraAddPage = () => {
  const navigate = useNavigate();

  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif"); // 🔁 sesuaikan endpoint kamu
      return res.data.data;
    },
  });

  if (isLoading) return <p>Loading...</p>; // atau Spinner dari AntD

  return (
    <ProgramRenstraForm
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/program")}
    />
  );
};

export default ProgramRenstraAddPage;
