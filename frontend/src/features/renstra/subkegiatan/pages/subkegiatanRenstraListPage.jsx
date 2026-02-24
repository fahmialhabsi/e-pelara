import React from "react";
import { Table, Button, Popconfirm, message, Spin, Alert, Empty } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSubkegiatanRenstra,
  deleteSubkegiatanRenstra,
} from "../api/subkegiatanRenstraApi";
import { useNavigate } from "react-router-dom";

const SubkegiatanRenstraListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["subkegiatan-renstra"],
    queryFn: async () => (await fetchSubkegiatanRenstra()).data,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubkegiatanRenstra,
    onSuccess: () => {
      message.success("Data berhasil dihapus 🗑️");
      queryClient.invalidateQueries(["subkegiatan-renstra"]);
    },
    onError: () => {
      message.error("Gagal menghapus data");
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  const columns = [
    {
      title: "Program",
      key: "program",
      render: (_, record) => (
        <div>
          <div>
            <strong>{record.kode_program}</strong>
          </div>
          <div>{record.nama_program}</div>
        </div>
      ),
    },
    {
      title: "Kode Subkegiatan",
      dataIndex: "kode_subkegiatan",
      key: "kode",
    },
    {
      title: "Nama Subkegiatan",
      dataIndex: "nama_subkegiatan",
      key: "nama",
    },
    {
      title: "Aksi",
      render: (_, record) => (
        <>
          <Button
            type="link"
            onClick={() => navigate(`/renstra/subkegiatan/edit/${record.id}`)}
          >
            ✏️ Edit
          </Button>
          <Popconfirm
            title="Yakin hapus?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger>
              🗑️ Hapus
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
        <Empty description="Belum ada data Sub Kegiatan Renstra" />
        <Button
          type="primary"
          onClick={() => navigate("/subkegiatan/add")}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Subkegiatan
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
        <Button type="primary" onClick={() => navigate("/subkegiatan/add")}>
          ➕ Tambah Subkegiatan
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" bordered />
    </div>
  );
};

export default SubkegiatanRenstraListPage;
