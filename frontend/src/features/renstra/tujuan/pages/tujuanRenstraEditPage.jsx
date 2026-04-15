import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchTujuanRenstraById } from "../api/tujuanRenstraApi";
import TujuanRenstraForm from "../components/TujuanRenstraForm";
import { Spin, Alert, Empty } from "antd";
import api from "@/services/api";
import { mergeRenstraAktifForEdit } from "@/features/renstra/utils/mergeRenstraAktifForEdit";

const TujuanRenstraEditPage = () => {
  const { id } = useParams();

  const { data, isLoading: loadingDetail, isError, error } = useQuery({
    queryKey: ["renstra-tujuan", id],
    queryFn: async () => {
      const res = await fetchTujuanRenstraById(id);
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

  const renstraAktif = useMemo(
    () => mergeRenstraAktifForEdit(data?.renstra, renstraAktifFallback),
    [data?.renstra, renstraAktifFallback]
  );

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

  return (
    <TujuanRenstraForm initialData={data} renstraAktif={renstraAktif} />
  );
};

export default TujuanRenstraEditPage;
