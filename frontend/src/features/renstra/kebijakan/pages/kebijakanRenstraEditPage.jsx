// src/features/renstra/kebijakan/pages/kebijakanRenstraEditPage.jsx (FINAL)
import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin, Alert, Empty } from "antd";
import api from "@/services/api"; // Pastikan path ini benar
import KebijakanRenstraForm from "../components/KebijakanRenstraForm";

const KebijakanRenstraEditPage = () => {
  const { id } = useParams(); // Mengambil ID dari URL

  // Query untuk mengambil data kebijakan yang akan diedit
  const {
    data: initialData,
    isLoading: loadingDetail,
    isError,
    error,
  } = useQuery({
    queryKey: ["renstra-kebijakan", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-kebijakan/${id}`);
      const row = res.data?.data ?? res.data;
      return row;
    },
    enabled: !!id,
    retry: 1,
  });

  const { data: renstraAktifFallback, isLoading: loadingRenstra } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data?.data ?? res.data;
    },
  });

  const isLoading = loadingDetail || loadingRenstra;

  // Tampilan loading
  if (isLoading) {
    return <Spin tip="Memuat data kebijakan..." size="large" fullscreen />;
  }

  // Tampilan error
  if (isError) {
    return (
      <Alert
        message="Gagal Memuat Data"
        description={
          error?.response?.data?.message ||
          "Terjadi kesalahan saat mengambil data."
        }
        type="error"
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  // Tampilan jika data tidak ditemukan
  if (!initialData) {
    return (
      <Empty
        description={`Data kebijakan dengan ID ${id} tidak ditemukan.`}
        style={{ marginTop: 48 }}
      />
    );
  }

  return (
    <KebijakanRenstraForm
      initialData={initialData}
      renstraAktif={initialData?.renstra ?? renstraAktifFallback}
    />
  );
};

export default KebijakanRenstraEditPage;
