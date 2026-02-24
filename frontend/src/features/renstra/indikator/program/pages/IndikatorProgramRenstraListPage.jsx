import React from "react";
import { Table, Button, Popconfirm, message, Spin, Alert, Empty } from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

const IndikatorProgramRenstraListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["indikator-program-renstra"],
    queryFn: async () => {
      const res = await api.get("/indikator-program-renstra");
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/indikator-program-renstra/${id}`);
    },
    onSuccess: () => {
      message.success("Data berhasil dihapus");
      queryClient.invalidateQueries(["indikator-program-renstra"]);
    },
    onError: () => {
      message.error("Gagal menghapus data");
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  const columns = [
    { title: "No", dataIndex: "kode_indikator", key: "no" },
    { title: "Nama Indikator", dataIndex: "nama_indikator", key: "nama" },
    { title: "Satuan", dataIndex: "satuan", key: "satuan" },
    { title: "Target Tahun 1", dataIndex: "target_tahun_1", key: "target" },
    {
      title: "Aksi",
      key: "aksi",
      render: (_, record) => (
        <>
          <Button
            type="link"
            onClick={() =>
              navigate(`/renstra/indikator-program/edit/${record.id}`)
            }
          >
            ✏️ Edit
          </Button>
          <Popconfirm
            title="Yakin ingin menghapus data ini?"
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

  if (isLoading) return <Spin fullscreen tip="Memuat data..." />;
  if (isError)
    return (
      <Alert
        type="error"
        message="Gagal memuat data"
        description={error?.response?.data?.message || error.message}
        style={{ margin: 24 }}
      />
    );

  if (!data || data.length === 0)
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data Indikator Program" />
        <Button
          type="primary"
          onClick={() => navigate("/renstra/indikator-program/add")}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Indikator Program
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
        <Button
          type="primary"
          onClick={() => navigate("/renstra/indikator-program/add")}
        >
          ➕ Tambah Indikator Program
        </Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" bordered />
    </div>
  );
};

export default IndikatorProgramRenstraListPage;
