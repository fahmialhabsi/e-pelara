import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin, Alert, Empty } from "antd";
import api from "@/services/api";
import KebijakanRenstraForm from "../components/KebijakanRenstraForm";
import { mergeRenstraAktifForEdit } from "@/features/renstra/utils/mergeRenstraAktifForEdit";

const KebijakanRenstraEditPage = () => {
  const { id } = useParams();

  const { data: initialData, isLoading, isError, error } = useQuery({
    queryKey: ["renstra-kebijakan", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-kebijakan/${id}`);
      return res.data?.data ?? res.data;
    },
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
  if (isError) return <Alert type="error" message={error?.message} />;
  if (!initialData) return <Empty description="Data tidak ditemukan" />;

  return (
    <KebijakanRenstraForm
      initialData={initialData}
      renstraAktif={renstraAktif}
    />
  );
};

export default KebijakanRenstraEditPage;