import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Spin } from "antd";

import api from "@/services/api";
import RenstraTabelArahKebijakanForm from "../components/RenstraTabelArahKebijakanForm";

const ENDPOINT = "/renstra-tabel-arah-kebijakan";
const LIST_PATH = "/renstra/tabel/arah-kebijakan";

export default function RenstraTabelArahKebijakanEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: renstraAktif,
    isLoading: loadingRenstra,
    error: renstraError,
  } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data?.data ?? res.data ?? null;
    },
  });

  const {
    data: initialData,
    isLoading: loadingData,
    error: dataError,
  } = useQuery({
    queryKey: ["renstra-tabel-arah-kebijakan-detail", id],
    queryFn: async () => {
      const res = await api.get(`${ENDPOINT}/${id}`);
      return res.data?.data ?? res.data ?? null;
    },
    enabled: !!id,
  });

  if (loadingRenstra || loadingData) {
    return <Spin tip="Memuat data arah kebijakan..." fullscreen />;
  }

  if (renstraError || dataError) {
    return (
      <Card title="Edit Tabel Arah Kebijakan">
        <Alert
          type="error"
          showIcon
          message="Gagal memuat data"
          description={
            renstraError?.response?.data?.message ||
            dataError?.response?.data?.message ||
            renstraError?.message ||
            dataError?.message ||
            "Terjadi kesalahan saat mengambil data."
          }
          style={{ marginBottom: 16 }}
        />

        <Button onClick={() => navigate(LIST_PATH)}>Kembali</Button>
      </Card>
    );
  }

  if (!initialData) {
    return (
      <Card title="Edit Tabel Arah Kebijakan">
        <Alert
          type="warning"
          showIcon
          message="Data tidak ditemukan"
          description="Data tabel arah kebijakan yang ingin diedit tidak tersedia."
          style={{ marginBottom: 16 }}
        />

        <Button onClick={() => navigate(LIST_PATH)}>Kembali</Button>
      </Card>
    );
  }

  return (
    <RenstraTabelArahKebijakanForm
      initialData={initialData}
      renstraAktif={renstraAktif}
    />
  );
}