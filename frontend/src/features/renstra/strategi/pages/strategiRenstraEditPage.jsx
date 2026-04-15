// src/features/renstra/strategi/pages/strategiRenstraEditPage.jsx (REFACTORED)
import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../services/api";
import StrategiRenstraForm from "../components/StrategiRenstraForm";
import { Spin, Empty } from "antd";
import { mergeRenstraAktifForEdit } from "@/features/renstra/utils/mergeRenstraAktifForEdit";

const StrategiRenstraEditPage = () => {
  const { id } = useParams();

  const { data: initialData, isLoading: isLoadingInitial } = useQuery({
    queryKey: ["strategi-renstra", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-strategi/${id}`);
      const row = res.data?.data ?? res.data;
      return row;
    },
    enabled: !!id,
  });

  const { data: renstraAktifFallback, isLoading: isLoadingAktif } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd/aktif");
      return res.data?.data ?? res.data;
    },
  });

  const isLoading = isLoadingInitial || isLoadingAktif;

  const renstraAktif = useMemo(
    () => mergeRenstraAktifForEdit(initialData?.renstra, renstraAktifFallback),
    [initialData?.renstra, renstraAktifFallback]
  );

  const initialDataForForm = useMemo(() => {
    if (!initialData) return null;
    return {
      ...initialData,
      strategi_rpjmd_id:
        initialData.rpjmd_strategi_id ?? initialData.strategi_rpjmd_id ?? null,
    };
  }, [initialData]);

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
      initialData={initialDataForForm}
      renstraAktif={renstraAktif}
    />
  );
};

export default StrategiRenstraEditPage;
