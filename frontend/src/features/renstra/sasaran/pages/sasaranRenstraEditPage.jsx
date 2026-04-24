// src/features/renstra/sasaran/pages/SasaranRenstraEditPage.jsx
import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin, Alert, Empty } from "antd";
import api from "@/services/api";
import SasaranRenstraForm from "../components/SasaranRenstraForm";
import { mergeRenstraAktifForEdit } from "@/features/renstra/utils/mergeRenstraAktifForEdit";

const SasaranRenstraEditPage = () => {
  const { id } = useParams();

  const {
    data: initialData,
    isLoading: loadingDetail,
    isError,
    error,
  } = useQuery({
    queryKey: ["renstra-sasaran", id],
    queryFn: async () => {
      const response = await api.get(`/renstra-sasaran/${id}`);
      const row = response.data?.data ?? response.data;
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

  const renstraAktif = useMemo(
    () => mergeRenstraAktifForEdit(initialData?.renstra, renstraAktifFallback),
    [initialData?.renstra, renstraAktifFallback]
  );

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

  return (
    <SasaranRenstraForm initialData={initialData} renstraAktif={renstraAktif} />
  );
};

export default SasaranRenstraEditPage;
