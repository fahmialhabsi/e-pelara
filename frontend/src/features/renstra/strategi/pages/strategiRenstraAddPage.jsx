// src/features/renstra/strategi/pages/strategiRenstraAddPage.jsx (REFACTORED)
import React from "react";
import StrategiRenstraForm from "../components/StrategiRenstraForm";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../services/api";
import { Spin, Alert, Empty } from "antd";

const StrategiRenstraAddPage = () => {
  const {
    data: renstraAktif,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd?is_aktif=true"); // Optimasi: filter di backend
      return res.data?.data?.[0] || null; // Ambil elemen pertama dari array data
    },
  });

  if (isLoading) {
    return <Spin tip="Memuat data Renstra aktif..." size="large" fullscreen />;
  }

  if (isError) {
    return (
      <Alert
        type="error"
        message="Gagal memuat data Renstra OPD"
        description={error?.response?.data?.message || "Terjadi kesalahan."}
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  if (!renstraAktif) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Tidak ada RENSTRA OPD yang aktif. Silakan aktifkan satu Renstra OPD terlebih dahulu." />
      </div>
    );
  }

  // renstraAktif diteruskan ke form untuk mengisi renstra_id dan rpjmd_id
  return <StrategiRenstraForm renstraAktif={renstraAktif} />;
};

export default StrategiRenstraAddPage;
