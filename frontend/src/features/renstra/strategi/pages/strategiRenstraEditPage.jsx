import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin, Alert, Empty } from "antd";
import api from "@/services/api";
import StrategiRenstraForm from "../components/StrategiRenstraForm";
import { mergeRenstraAktifForEdit } from "@/features/renstra/utils/mergeRenstraAktifForEdit";

const StrategiRenstraEditPage = () => {
  const { id } = useParams();

  const { data: initialData, isLoading, isError, error } = useQuery({
    queryKey: ["renstra-strategi", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-strategi/${id}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });

  const { data: renstraAktifFallback } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data?.data ?? res.data;
    },
  });

  const renstraAktif = useMemo(
    () => mergeRenstraAktifForEdit(initialData?.renstra, renstraAktifFallback),
    [initialData?.renstra, renstraAktifFallback]
  );

  if (isLoading) return <Spin fullscreen />;

  if (isError)
    return <Alert message="Error" description={error?.message} type="error" />;

  if (!initialData)
    return <Empty description={`Data strategi ID ${id} tidak ditemukan`} />;

  return (
    <StrategiRenstraForm
      initialData={initialData}
      renstraAktif={renstraAktif}
    />
  );
};

export default StrategiRenstraEditPage;