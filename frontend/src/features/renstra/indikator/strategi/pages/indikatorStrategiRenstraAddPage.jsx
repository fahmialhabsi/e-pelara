import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";
import api from "@/services/api";
import IndikatorStrategiRenstraForm from "../components/IndikatorStrategiRenstraForm";

const IndikatorStrategiRenstraAddPage = () => {
  const navigate = useNavigate();
  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data?.data || res.data;
    },
  });

  if (isLoading) return <Spin tip="Memuat Renstra aktif..." fullscreen />;

  return (
    <IndikatorStrategiRenstraForm
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/indikator/strategi")}
    />
  );
};

export default IndikatorStrategiRenstraAddPage;
