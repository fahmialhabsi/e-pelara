import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";
import api from "@/services/api";
import RenstraTabelStrategiKebijakanForm from "../components/RenstraTabelStrategiKebijakanForm";

const RenstraTabelStrategiKebijakanAddPage = () => {
  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => (await api.get("/renstra-opd/aktif")).data.data,
  });

  if (isLoading) return <Spin tip="Memuat Renstra aktif..." fullscreen />;
  return <RenstraTabelStrategiKebijakanForm renstraAktif={renstraAktif} />;
};

export default RenstraTabelStrategiKebijakanAddPage;
