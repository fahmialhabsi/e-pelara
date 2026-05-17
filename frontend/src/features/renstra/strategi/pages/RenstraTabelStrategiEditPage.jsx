import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";
import api from "@/services/api";
import RenstraTabelStrategiForm from "../components/RenstraTabelStrategiForm";

export default function RenstraTabelStrategiEditPage() {
  const { id } = useParams();

  const { data: renstraAktif, isLoading: loadingRenstra } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => (await api.get("/renstra-opd/aktif")).data.data,
  });

  const { data: initialData, isLoading: loadingData } = useQuery({
    queryKey: ["renstra-tabel-strategi", id],
    queryFn: async () => (await api.get(`/renstra-tabel-strategi/${id}`)).data,
    enabled: !!id,
  });

  if (loadingRenstra || loadingData) return <Spin tip="Memuat data..." fullscreen />;
  return <RenstraTabelStrategiForm initialData={initialData} renstraAktif={renstraAktif} />;
}
