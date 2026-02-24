// pages/renstra/indikator-tujuan/IndikatorTujuanRenstraListPage.jsx

import React from "react";
import {
  Table,
  Button,
  Popconfirm,
  message,
  Spin,
  Alert,
  Empty,
  Card,
  Space,
} from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

const IndikatorTujuanRenstraListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["indikator-tujuan-renstra"],
    queryFn: async () => {
      const res = await api.get("/api/indikator-tujuan-renstra");
      return res.data;
    },
  });

  const { mutate: deleteData, isLoading: isDeleting } = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/indikator-tujuan-renstra/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["indikator-tujuan-renstra"]);
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
      title: "Target Tahun 1",
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
      title="Indikator Tujuan Renstra"
      extra={
        <Space>
          <Button onClick={() => navigate("/renstra")} type="default">
            🔙 Kembali ke Dashboard Renstra
          </Button>
          <Button
            type="primary"
            onClick={() => navigate("create")}
            icon={<span>➕</span>}
          >
            Tambah Indikator Kebijakan
          </Button>
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

export default IndikatorTujuanRenstraListPage;
