import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Spin, Alert } from "antd";
import api from "@/services/api";
import KebijakanRenstraForm from "../components/KebijakanRenstraForm";

const KebijakanRenstraAddPage = () => {
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
  });

  if (isLoading) return <Spin fullscreen />;

  if (isError) {
    return (
      <Alert
        type="error"
        message="Gagal Memuat RENSTRA"
        description={error?.message}
      />
    );
  }

  if (!renstraAktif) {
    return <Alert type="warning" message="RENSTRA belum aktif" />;
  }

  return <KebijakanRenstraForm renstraAktif={renstraAktif} />;
};

export default KebijakanRenstraAddPage;