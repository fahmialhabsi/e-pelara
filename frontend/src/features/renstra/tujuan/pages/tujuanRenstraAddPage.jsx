import React from "react";
import TujuanRenstraForm from "../components/TujuanRenstraForm";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../services/api";
import { Spin, Alert } from "antd";

const TujuanRenstraAddPage = () => {
  const {
    data: renstraAktif,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd");
      console.log("Response from /renstra-opd:", res.data);

      if (Array.isArray(res.data?.data)) {
        const found = res.data.data.find((item) => item.is_aktif);
        return found || null; // ⬅️ aman dari undefined
      }

      return null;
    },
    retry: 1,
    onError: (err) => {
      console.error("Gagal fetch Renstra OPD aktif:", err);
    },
  });

  if (isLoading)
    return <Spin tip="Memuat data Renstra aktif..." size="large" fullscreen />;

  if (isError)
    return (
      <Alert
        type="error"
        message="Gagal memuat data Renstra OPD"
        description={
          error?.response?.data?.message ||
          "Terjadi kesalahan saat memuat data Renstra aktif."
        }
        showIcon
        style={{ margin: 24 }}
      />
    );

  if (!renstraAktif)
    return (
      <Alert
        type="warning"
        message="Tidak ada RENSTRA OPD yang aktif"
        description="Silakan aktifkan satu Renstra OPD terlebih dahulu sebelum menambah Tujuan Renstra."
        showIcon
        style={{ margin: 24 }}
      />
    );

  return <TujuanRenstraForm renstraAktif={renstraAktif} />;
};

export default TujuanRenstraAddPage;
