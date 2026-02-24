// src/features/renstra/sasaran/pages/sasaranRenstraListPage.jsx
import React from "react";
import {
  App,
  Table,
  Button,
  Popconfirm,
  Spin,
  Alert,
  Empty,
  Space,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { BsPencil, BsTrash, BsPlus, BsArrowLeftCircle } from "react-icons/bs";

const SasaranRenstraListPage = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Ambil data dari server → langsung return array
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["renstra-sasaran"],
    queryFn: async () => {
      const res = await api.get("/renstra-sasaran");
      return res.data?.data || []; // ⬅️ hanya array yang dikembalikan
    },
  });

  // Mutasi hapus data
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/renstra-sasaran/${id}`),
    onSuccess: () => {
      message.success("Data sasaran berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["renstra-sasaran"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Gagal menghapus data");
    },
  });

  // Kolom tabel
  const columns = [
    {
      title: "Sasaran Renstra",
      key: "sasaran_renstra",
      render: (_, record) => (
        <pre
          style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap" }}
        >
          <strong>{record.nomor}</strong> - {record.isi_sasaran}
        </pre>
      ),
    },
    {
      title: "Sasaran RPJMD Terkait",
      key: "sasaran_rpjmd",
      render: (_, record) => {
        if (record.no_rpjmd && record.isi_sasaran_rpjmd) {
          return (
            <div>
              <strong>{record.no_rpjmd}</strong> - {record.isi_sasaran_rpjmd}
            </div>
          );
        }
        return <span style={{ color: "gray" }}>Tidak ada</span>;
      },
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<BsPencil />}
            onClick={() => navigate(`/renstra/sasaran/edit/${record.id}`)}
          />
          <Popconfirm
            title="Hapus Sasaran?"
            description="Apakah Anda yakin ingin menghapus data ini?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Ya, Hapus"
            cancelText="Batal"
          >
            <Button
              type="link"
              danger
              icon={<BsTrash />}
              loading={deleteMutation.isLoading}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Loading state
  if (isLoading) {
    return <Spin tip="Memuat data..." size="large" fullscreen />;
  }

  // Error handling
  if (isError) {
    return (
      <Alert
        message="Gagal Memuat Data"
        description={
          error?.response?.data?.message ||
          "Terjadi kesalahan saat mengambil data dari server."
        }
        type="error"
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  // Render utama
  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <h2>Daftar Sasaran Renstra</h2>
        <Space>
          <Button
            icon={<BsArrowLeftCircle />}
            onClick={() => navigate("/dashboard-renstra")}
          >
            Kembali ke Dashboard
          </Button>
          <Button
            type="primary"
            icon={<BsPlus />}
            onClick={() => navigate("/renstra/sasaran/add")}
          >
            Tambah Sasaran
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={data || []} // ⬅️ selalu array
        rowKey="id"
        bordered
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: <Empty description="Belum ada data Sasaran Renstra." />,
        }}
      />
    </div>
  );
};

export default SasaranRenstraListPage;
