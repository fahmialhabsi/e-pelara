import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";
import api from "@/services/api";
import RenstraTabelPrioritasForm from "../components/RenstraTabelPrioritasForm";

const RenstraTabelPrioritasEditPage = () => {
  const { jenis = "nasional", id } = useParams();

  const { data: renstraAktif, isLoading: loadingRenstra } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => (await api.get("/renstra-opd/aktif")).data.data,
  });

  const { data: initialData, isLoading: loadingData } = useQuery({
    queryKey: ["renstra-tabel-prioritas", id],
    queryFn: async () => (await api.get(`/renstra-tabel-prioritas/${id}`)).data,
    enabled: !!id,
  });

  if (loadingRenstra || loadingData) return <Spin tip="Memuat data..." fullscreen />;
  return <RenstraTabelPrioritasForm initialData={initialData} renstraAktif={renstraAktif} jenisPrioritas={jenis} />;
};

export default RenstraTabelPrioritasEditPage;
