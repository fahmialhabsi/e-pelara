// src/features/renstra/indikator/umumRentra/pages/indikatorUmumRenstraListPage.jsx
import React from "react";
import {
  Table,
  Button,
  Popconfirm,
  Spin,
  Alert,
  Empty,
  Card,
  Space,
  App,
} from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

// 🔹 Komponen Tombol Import
const ImportFromRPJMDButton = ({ stage, renstraId, onSuccess }) => {
  const { message } = App.useApp();

  const handleImport = async () => {
    try {
      const res = await api.post("/indikator-renstra/import", {
        stage,
        renstra_id: renstraId,
      });
      message.success(res.data.message || "Import berhasil");
      if (onSuccess) onSuccess(); // refresh data list
    } catch (err) {
      console.error(err);
      message.error("Gagal import dari RPJMD");
    }
  };
};

const IndikatorUmumRenstraListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp(); // ✅ ambil context message di sini

  // ✅ ganti sesuai id renstra kamu
  const renstraId = 1;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["indikator-umum-renstra"],
    queryFn: async () => {
      const res = await api.get("/indikator-renstra");
      return res.data;
    },
  });

  const { mutate: deleteData, isLoading: isDeleting } = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/indikator-renstra/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["indikator-umum-renstra"]);
      message.success("Data berhasil dihapus");
    },
    onError: () => {
      message.error("Gagal menghapus data");
    },
  });

  const columns = [
    {
      title: "No",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Nama Indikator",
      dataIndex: "nama_indikator",
      key: "nama_indikator",
    },
    {
      title: "Satuan",
      dataIndex: "satuan",
      key: "satuan",
    },
    {
      title: "Target (th. ke-1)",
      dataIndex: "target_tahun_1",
      key: "target_tahun_1",
    },
    {
      title: "Aksi",
      render: (_, record) => (
        <Space>
          <Button onClick={() => navigate(`edit/${record.id}`)} size="small">
            ✏️
          </Button>
          <Popconfirm
            title="Hapus data ini?"
            onConfirm={() => deleteData(record.id)}
            okText="Ya"
            cancelText="Batal"
          >
            <Button danger size="small" loading={isDeleting}>
              🗑️
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Indikator Umum Renstra"
      extra={
        <Space>
          <Button onClick={() => navigate("/dashboard-renstra")}>
            🔙 Kembali ke Dashboard Renstra
          </Button>
          <ImportFromRPJMDButton
            stage="tujuan"
            renstraId={renstraId}
            onSuccess={() =>
              queryClient.invalidateQueries(["indikator-umum-renstra"])
            }
          />
        </Space>
      }
    >
      {isLoading ? (
        <Spin fullscreen />
      ) : isError ? (
        <Alert
          type="error"
          message="Terjadi kesalahan"
          description={error.message}
        />
      ) : data?.length === 0 ? (
        <Empty description="Belum ada data">
          <Button type="primary" onClick={() => navigate("create")}>
            ➕ Tambah
          </Button>
        </Empty>
      ) : (
        <Table columns={columns} dataSource={data} rowKey="id" />
      )}
    </Card>
  );
};

export default IndikatorUmumRenstraListPage;
