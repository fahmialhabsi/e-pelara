import React from "react";
import {
  Table,
  Button,
  Popconfirm,
  message,
  Spin,
  Alert,
  Empty,
  Space,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTujuanRenstra,
  deleteTujuanRenstra,
} from "../api/tujuanRenstraApi";
import { useNavigate } from "react-router-dom";
import { BsPencilSquare, BsTrash } from "react-icons/bs";

const TujuanRenstraListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["renstra-tujuan"],
    queryFn: async () => {
      const res = await fetchTujuanRenstra();
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTujuanRenstra,
    onSuccess: () => {
      message.success("Tujuan berhasil dihapus 🗑️");
      queryClient.invalidateQueries({ queryKey: ["renstra-tujuan"] });
    },
    onError: () => {
      message.error("Gagal menghapus tujuan");
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
      title: "Tujuan RPJMD",
      key: "tujuan_rpjmd",
      render: (_, record) => (
        <span>
          <strong>
            {`${record.no_rpjmd || "-"} - ${record.isi_tujuan_rpjmd || "-"}`}
          </strong>
        </span>
      ),
    },
    {
      title: "Tujuan Renstra",
      key: "tujuan_renstra",
      render: (_, record) => (
        <span>
          <strong>
            {`${record.no_tujuan || "-"} - ${record.isi_tujuan || "-"}`}
          </strong>
        </span>
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
            onClick={() => navigate(`/renstra/tujuan/edit/${record.id}`)}
          >
            ✏️ Edit
          </Button>
          <Popconfirm
            title="Yakin ingin menghapus?"
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

  if (isLoading)
    return <Spin tip="Memuat daftar tujuan..." size="large" fullscreen />;
  if (isError)
    return (
      <Alert
        message="Gagal memuat data"
        description={error?.message || "Terjadi kesalahan"}
        type="error"
        showIcon
        style={{ margin: 24 }}
      />
    );
  if (!data || data.length === 0)
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data Tujuan Renstra" />
        <Button
          type="primary"
          onClick={() => navigate("/renstra/tujuan/add")}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Tujuan
        </Button>
      </div>
    );

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
        <Button type="primary" onClick={() => navigate("/renstra/tujuan/add")}>
          ➕ Tambah Tujuan
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" bordered />
    </div>
  );
};

export default TujuanRenstraListPage;
