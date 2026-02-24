// src/features/renstra/kebijakan/pages/kebijakanRenstraAddPage.jsx (FINAL FIX)
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Spin, Alert } from "antd";
import api from "@/services/api";
import KebijakanRenstraForm from "../components/KebijakanRenstraForm";

const KebijakanRenstraAddPage = () => {
  // Ambil RENSTRA aktif
  const {
    data: renstraAktif,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd?is_aktif=true");

      // ✅ Sesuaikan dengan format response baru { message, data: [...] }
      if (res?.data?.data && Array.isArray(res.data.data)) {
        return res.data.data[0] || null;
      }
      return null;
    },
    retry: 1,
  });

  // Loading
  if (isLoading) {
    return <Spin tip="Memuat data RENSTRA aktif..." size="large" fullscreen />;
  }

  // Error / Tidak ada RENSTRA aktif
  if (isError || !renstraAktif) {
    return (
      <Alert
        type={isError ? "error" : "warning"}
        message={
          isError ? "Gagal Memuat RENSTRA OPD" : "Tidak Ada RENSTRA yang Aktif"
        }
        description={
          isError
            ? error?.response?.data?.message ||
              "Terjadi kesalahan saat mengambil data."
            : "Mohon aktifkan satu RENSTRA OPD terlebih dahulu sebelum melanjutkan."
        }
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  // ✅ Render Form
  return <KebijakanRenstraForm renstraAktif={renstraAktif} />;
};

export default KebijakanRenstraAddPage;
