// src/features/renstra/strategi/pages/strategiRenstraListPage.jsx (REFACTORED)
import React from "react";
import {
  Table,
  Button,
  Popconfirm,
  message,
  Spin,
  Empty,
  Alert,
  Space,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../../services/api";
import { useNavigate } from "react-router-dom";
import {
  BsArrowLeftCircle,
  BsPlusCircle,
  BsPencilSquare,
  BsTrash,
} from "react-icons/bs";

const StrategiRenstraListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["strategi-renstra"],
    queryFn: () => api.get("/renstra-strategi").then((res) => res.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/renstra-strategi/${id}`),
    onSuccess: () => {
      message.success("Data berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["strategi-renstra"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Gagal menghapus data");
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  const columns = [
    {
      title: "No",
      dataIndex: "index",
      key: "index",
      render: (_, __, index) => index + 1,
      width: "5%",
    },
    {
      title: "Strategi Renstra",
      key: "strategi_renstra",
      render: (_, record) => (
        // Menggunakan field yang benar dari database
        <strong>{`${record.kode_strategi || "-"} - ${
          record.deskripsi || "-"
        }`}</strong>
      ),
    },
    {
      title: "Strategi RPJMD (Induk)",
      key: "strategi_rpjmd",
      render: (_, record) => (
        <span>{`${record.no_rpjmd || "-"} - ${
          record.isi_strategi_rpjmd || "-"
        }`}</span>
      ),
    },
    {
      title: "Aksi",
      key: "aksi",
      width: "15%",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<BsPencilSquare />}
            onClick={() => navigate(`/renstra/strategi/edit/${record.id}`)}
          >
            ✏️ Edit
          </Button>
          <Popconfirm
            title="Yakin hapus data ini?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ya, Hapus"
            cancelText="Batal"
          >
            <Button type="link" danger icon={<BsTrash />}>
              🗑️ Hapus
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isLoading) return <Spin tip="Memuat data..." size="large" fullscreen />;
  if (isError)
    return (
      <Alert
        message="Gagal Memuat Data"
        description={error.message}
        type="error"
        showIcon
      />
    );

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Button
          icon={<BsArrowLeftCircle />}
          onClick={() => navigate("/dashboard-renstra")}
        >
          🔙 Kembali ke Dashboard
        </Button>
        <Button
          type="primary"
          icon={<BsPlusCircle />}
          onClick={() => navigate("/renstra/strategi/add")}
        >
          ➕ Tambah Strategi
        </Button>
      </div>

      {Array.isArray(data) && data.length > 0 ? (
        <Table columns={columns} dataSource={data} rowKey="id" bordered />
      ) : (
        <Empty description="Belum ada data Strategi Renstra." />
      )}
    </div>
  );
};

export default StrategiRenstraListPage;
