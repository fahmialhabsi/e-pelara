// src/features/renstra/sasaran/pages/sasaranRenstraAddPage.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Spin, Alert } from "antd";
import api from "@/services/api";
import SasaranRenstraForm from "../components/SasaranRenstraForm";

const SasaranRenstraAddPage = () => {
  // Query untuk mengambil Renstra OPD yang aktif
  const {
    data: renstraAktif,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd?is_aktif=true");
      console.log("Response from /renstra-opd:", res.data);

      if (Array.isArray(res.data?.data)) {
        return res.data.data[0] || null; // selalu return null kalau kosong
      }

      return null;
    },
    retry: 1,
    onError: (err) => {
      console.error("Gagal fetch Renstra OPD aktif:", err);
    },
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
        description="Mohon aktifkan satu RENSTRA OPD terlebih dahulu di menu pengaturan sebelum melanjutkan."
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  return <SasaranRenstraForm renstraAktif={renstraAktif} />;
};

export default SasaranRenstraAddPage;
