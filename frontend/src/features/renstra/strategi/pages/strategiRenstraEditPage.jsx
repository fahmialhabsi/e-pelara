// src/features/renstra/strategi/pages/strategiRenstraEditPage.jsx (REFACTORED)
import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../services/api";
import StrategiRenstraForm from "../components/StrategiRenstraForm";
import { Spin, Alert, Empty } from "antd";

const StrategiRenstraEditPage = () => {
  const { id } = useParams();

  // Ambil data strategi yang akan di-edit
  const { data: initialData, isLoading: isLoadingInitial } = useQuery({
    queryKey: ["strategi-renstra", id],
    queryFn: () => api.get(`/renstra-strategi/${id}`).then((res) => res.data),
    enabled: !!id, // Hanya jalankan jika ada ID
  });

  // Ambil juga data renstra aktif, untuk konsistensi
  const { data: renstraAktif, isLoading: isLoadingAktif } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: () =>
      api.get("/renstra-opd?is_aktif=true").then((res) => res.data[0] || null),
  });

  const isLoading = isLoadingInitial || isLoadingAktif;

  if (isLoading) {
    return <Spin tip="Memuat data..." size="large" fullscreen />;
  }

  if (!initialData) {
    return (
      <Empty
        description={`Data Strategi dengan ID ${id} tidak ditemukan.`}
        style={{ marginTop: 48 }}
      />
    );
  }

  return (
    <StrategiRenstraForm
      initialData={initialData}
      renstraAktif={renstraAktif} // Teruskan juga renstraAktif
    />
  );
};

export default StrategiRenstraEditPage;
