// src/features/renstra/sasaran/pages/SasaranRenstraEditPage.jsx
import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin, Alert, Empty } from "antd";
import api from "@/services/api";
import SasaranRenstraForm from "../components/SasaranRenstraForm";

const SasaranRenstraEditPage = () => {
  const { id } = useParams();

  const {
    data: initialData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["renstra-sasaran", id],
    queryFn: async () => {
      const response = await api.get(`/renstra-sasaran/${id}`);
      return response.data;
    },
    enabled: !!id, // hanya dijalankan jika id ada
    retry: 1,
  });

  // Menampilkan loading screen
  if (isLoading) {
    return <Spin tip="Memuat data sasaran..." size="large" fullscreen />;
  }

  // Menampilkan error jika gagal memuat
  if (isError) {
    return (
      <Alert
        message="Gagal Memuat Data"
        description={
          error?.response?.data?.message ||
          "Terjadi kesalahan saat mengambil data dari server."
        }
        type="error"
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  // Jika data kosong
  if (!initialData) {
    return (
      <Empty
        description={`Data sasaran dengan ID ${id} tidak ditemukan.`}
        style={{ marginTop: 48 }}
      />
    );
  }

  // Tampilkan form edit dengan data awal
  return <SasaranRenstraForm initialData={initialData} />;
};

export default SasaranRenstraEditPage;
