import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";
import api from "@/services/api";
import RenstraTabelPrioritasForm from "../components/RenstraTabelPrioritasForm";

const RenstraTabelPrioritasAddPage = () => {
  const { jenis = "nasional" } = useParams();

  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => (await api.get("/renstra-opd/aktif")).data.data,
  });

  if (isLoading) return <Spin tip="Memuat Renstra aktif..." fullscreen />;
  return <RenstraTabelPrioritasForm renstraAktif={renstraAktif} jenisPrioritas={jenis} />;
};

export default RenstraTabelPrioritasAddPage;
