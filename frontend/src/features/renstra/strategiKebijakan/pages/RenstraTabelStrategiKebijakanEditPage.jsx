import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";
import api from "@/services/api";
import RenstraTabelStrategiKebijakanForm from "../components/RenstraTabelStrategiKebijakanForm";

const RenstraTabelStrategiKebijakanEditPage = () => {
  const { id } = useParams();

  const { data: renstraAktif, isLoading: loadingRenstra } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => (await api.get("/renstra-opd/aktif")).data.data,
  });

  const { data: initialData, isLoading: loadingData } = useQuery({
    queryKey: ["renstra-tabel-strategi-kebijakan", id],
    queryFn: async () => (await api.get(`/renstra-tabel-strategi-kebijakan/${id}`)).data,
    enabled: !!id,
  });

  if (loadingRenstra || loadingData) return <Spin tip="Memuat data..." fullscreen />;
  return <RenstraTabelStrategiKebijakanForm initialData={initialData} renstraAktif={renstraAktif} />;
};

export default RenstraTabelStrategiKebijakanEditPage;
