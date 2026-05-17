import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Spin, Alert } from "antd";
import api from "@/services/api";
import StrategiRenstraForm from "../components/StrategiRenstraForm";

const StrategiRenstraAddPage = () => {
  const {
    data: renstraAktif,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd?is_aktif=true");

      if (Array.isArray(res.data?.data)) {
        return res.data.data[0] || null;
      }
      return null;
    },
    retry: 1,
  });

  if (isLoading) {
    return <Spin tip="Memuat data RENSTRA aktif..." size="large" fullscreen />;
  }

  if (isError) {
    return (
      <Alert
        type="error"
        message="Gagal Memuat RENSTRA OPD"
        description={
          error?.response?.data?.message ||
          "Terjadi kesalahan saat mengambil data."
        }
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  if (!renstraAktif) {
    return (
      <Alert
        type="warning"
        message="Tidak Ada RENSTRA yang Aktif"
        description="Aktifkan RENSTRA terlebih dahulu."
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  return <StrategiRenstraForm renstraAktif={renstraAktif} />;
};

export default StrategiRenstraAddPage;