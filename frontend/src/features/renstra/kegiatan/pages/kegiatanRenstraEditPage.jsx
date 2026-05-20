import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin, Alert, Button, Space } from "antd";
import { BsArrowLeftCircle } from "react-icons/bs";
import { fetchKegiatanRenstraById } from "../api/kegiatanRenstraApi";
import KegiatanRenstraForm from "../components/KegiatanRenstraForm";
import api from "@/services/api";
import { mergeRenstraAktifForEdit } from "@/features/renstra/utils/mergeRenstraAktifForEdit";

const KegiatanRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading: loadingDetail } = useQuery({
    queryKey: ["kegiatan-renstra", id],
    queryFn: async () => {
      const res = await fetchKegiatanRenstraById(id);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });

  const { data: renstraAktifFallback, isLoading: loadingRenstra } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd?is_aktif=true");
      if (Array.isArray(res.data?.data)) {
        return res.data.data[0] || null;
      }
      return res.data?.data ?? res.data ?? null;
    },
    retry: 1,
  });

  const isLoading = loadingDetail || loadingRenstra;

  const renstraAktif = useMemo(
    () => mergeRenstraAktifForEdit(data?.renstra, renstraAktifFallback),
    [data?.renstra, renstraAktifFallback],
  );

  if (isLoading) return <Spin tip="Memuat data kegiatan..." fullscreen />;

  if (!renstraAktif) {
    return (
      <Alert
        type="warning"
        message="Tidak Ada RENSTRA yang Aktif"
        description="Mohon aktifkan satu RENSTRA OPD terlebih dahulu di menu pengaturan sebelum melanjutkan."
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => navigate("/dashboard-renstra")} icon={<BsArrowLeftCircle />}>
          Kembali
        </Button>
      </Space>

      <KegiatanRenstraForm
        initialData={data}
        renstraAktif={renstraAktif}
        onSuccess={() => navigate("/renstra/kegiatan")}
      />
    </div>
  );
};

export default KegiatanRenstraEditPage;
