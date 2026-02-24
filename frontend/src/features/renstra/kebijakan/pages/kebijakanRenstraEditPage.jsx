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
    data: initialData, // Data awal untuk form
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["renstra-kebijakan", id], // Query key yang mencakup ID
    queryFn: async () => (await api.get(`/renstra-kebijakan/${id}`)).data, // Mengambil data per ID
    enabled: !!id, // Hanya jalankan query jika ID ada
    retry: 1, // Coba lagi sekali jika gagal
  });

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

  // Menampilkan form dengan data awal (initialData)
  return <KebijakanRenstraForm initialData={initialData} />;
};

export default KebijakanRenstraEditPage;
