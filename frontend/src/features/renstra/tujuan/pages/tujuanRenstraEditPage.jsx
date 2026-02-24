import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchTujuanRenstraById } from "../api/tujuanRenstraApi";
import TujuanRenstraForm from "../components/TujuanRenstraForm";
import { Spin, Alert, Empty } from "antd";

const TujuanRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["renstra-tujuan", id],
    queryFn: async () => {
      const res = await fetchTujuanRenstraById(id);
      return res.data;
    },
    retry: 1,
    onError: (err) => {
      console.error("Gagal mengambil data:", err);
    },
  });

  if (isLoading)
    return <Spin tip="Memuat data tujuan renstra..." size="large" fullscreen />;

  if (isError)
    return (
      <Alert
        message="Gagal memuat data"
        description={
          error?.response?.data?.message || "Terjadi kesalahan server."
        }
        type="error"
        showIcon
        style={{ margin: 24 }}
      />
    );

  if (!data)
    return (
      <Empty description="Data tidak ditemukan" style={{ marginTop: 48 }} />
    );

  return <TujuanRenstraForm initialData={data} />;
};

export default TujuanRenstraEditPage;
