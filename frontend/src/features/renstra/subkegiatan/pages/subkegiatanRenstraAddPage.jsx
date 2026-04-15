import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";
import SubkegiatanRenstraForm from "../components/SubkegiatanRenstraForm";
import api from "@/services/api";

const SubkegiatanRenstraAddPage = () => {
  const navigate = useNavigate();

  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data.data;
    },
  });

  if (isLoading) return <Spin tip="Memuat Renstra aktif..." fullscreen />;

  return (
    <SubkegiatanRenstraForm
      renstraAktif={renstraAktif}
      onSuccess={() => navigate("/renstra/subkegiatan")}
    />
  );
};

export default SubkegiatanRenstraAddPage;
