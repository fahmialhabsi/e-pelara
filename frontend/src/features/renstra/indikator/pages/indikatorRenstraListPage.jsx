import React from "react";
import {
  Table,
  Button,
  Popconfirm,
  message,
  Spin,
  Alert,
  Empty,
  Tooltip,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchIndikatorRenstra,
  deleteIndikatorRenstra,
} from "../api/indikatorRenstraApi";
import { useNavigate } from "react-router-dom";

const IndikatorRenstraListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["indikator-renstra"],
    queryFn: async () => {
      const res = await fetchIndikatorRenstra();
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIndikatorRenstra,
    onSuccess: () => {
      message.success("Data berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["indikator-renstra"] });
    },
    onError: () => {
      message.error("Gagal menghapus data");
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  const columns = [
    {
      title: "No",
      dataIndex: "no_indikator",
      key: "no",
      render: (text) => text || "-",
    },
    {
      title: "Deskripsi",
      dataIndex: "deskripsi",
      key: "deskripsi",
      render: (text) => (
        <Tooltip title={text}>
          {text?.length > 100 ? `${text.slice(0, 100)}...` : text}
        </Tooltip>
      ),
    },
    {
      title: "Aksi",
      key: "aksi",
      render: (_, record) => (
        <>
          <Button
            type="link"
            onClick={() => navigate(`/indikator/edit/${record.id}`)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Yakin ingin menghapus indikator ini?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ya"
            cancelText="Batal"
          >
            <Button type="link" danger loading={deleteMutation.isLoading}>
              Hapus
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  if (isLoading) {
    return <Spin tip="Memuat data..." size="large" fullscreen />;
  }

  if (isError) {
    return (
      <Alert
        message="Gagal memuat data"
        description={error?.message || "Terjadi kesalahan"}
        type="error"
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data Indikator Renstra" />
        <Button
          type="primary"
          onClick={() => navigate("/indikator/add")}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Indikator
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali ke Dashboard Renstra
        </Button>
        <Button type="primary" onClick={() => navigate("/indikator/add")}>
          ➕ Tambah Indikator
        </Button>
      </div>

      <Table columns={columns} dataSource={data} rowKey="id" bordered />
    </div>
  );
};

export default IndikatorRenstraListPage;
